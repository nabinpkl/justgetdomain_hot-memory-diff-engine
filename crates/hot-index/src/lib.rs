//! Hot-swappable in-memory lookup indexes.
//!
//! Two pieces:
//!
//! - [`HotIndex`]  a small trait describing the read surface of a lookup
//!   index (`get`, `contains`, `len`).
//! - [`HotSwap`]  a wrapper around [`arc_swap::ArcSwap`] that lets a
//!   writer atomically replace the live value without blocking readers.
//!
//! A reader's [`HotSwap::load`] never blocks on a concurrent
//! [`HotSwap::swap`]. The previous snapshot stays alive until the last
//! outstanding reader drops its guard, then is freed automatically.
//!
//! Typical use: a nightly batch builds an immutable index, then publishes
//! it through [`HotSwap::swap`]. In-flight queries see a consistent
//! snapshot for their lifetime; new queries pick up the fresh one on
//! their next [`HotSwap::load`].
//!
//! # Persistence (features `bincode`, `rkyv`)
//!
//! Two pluggable codecs share one atomic-write surface. Enable whichever
//! Cargo feature matches your value's serialization story:
//!
//! - `bincode`  for `T: serde::Serialize + serde::de::DeserializeOwned`.
//!   Smaller dep tree; full materialization on load.
//! - `rkyv`  for `T: rkyv::Archive + …`. Larger dep tree; faster
//!   cold-start through framed layout.
//!
//! Pick at the call site by which module's `save` / `load` you import:
//!
//! ```ignore
//! hot_index::persistence::bincode::save(&path, &value)?;
//! hot_index::persistence::rkyv::save(&path, &value)?;
//! ```
//!
//! The intended lifecycle: build an index → `persistence::*::save` →
//! process restart → `persistence::*::load` → wrap in [`HotSwap::new`] →
//! resume serving. No WAL, no replication, no transactions  this is
//! crash-recovery for a workload whose source of truth lives upstream
//! (the nightly batch input).

use std::borrow::Borrow;
use std::hash::Hash;
use std::sync::Arc;

use arc_swap::{ArcSwap, Guard};
use rustc_hash::FxHashMap;

pub mod persistence;

/// Read surface of a lookup index.
///
/// Implementors are typically immutable snapshots  mutation happens by
/// building a new index and publishing it through [`HotSwap::swap`]
/// rather than by mutating in place.
pub trait HotIndex<K, V>: Send + Sync {
    fn get<Q>(&self, key: &Q) -> Option<&V>
    where
        K: Borrow<Q>,
        Q: ?Sized + Hash + Eq;

    fn contains<Q>(&self, key: &Q) -> bool
    where
        K: Borrow<Q>,
        Q: ?Sized + Hash + Eq,
    {
        self.get(key).is_some()
    }

    fn len(&self) -> usize;

    fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

/// Default [`HotIndex`] implementation backed by [`FxHashMap`].
///
/// `FxHashMap` uses the `rustc-hash` non-cryptographic hasher, which is
/// faster than `std::collections::HashMap`'s default for short keys at
/// the cost of HashDoS resistance  appropriate for indexes built from
/// trusted batch input, not appropriate for keys derived from untrusted
/// network input without prior validation.
#[derive(Debug, Default, Clone)]
#[cfg_attr(feature = "bincode", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(
    feature = "bincode",
    serde(bound(
        serialize = "K: Eq + Hash + serde::Serialize, V: serde::Serialize",
        deserialize = "K: Eq + Hash + serde::Deserialize<'de>, V: serde::Deserialize<'de>"
    ))
)]
#[cfg_attr(
    feature = "rkyv",
    derive(rkyv::Archive, rkyv::Serialize, rkyv::Deserialize)
)]
pub struct FxHashIndex<K, V>(FxHashMap<K, V>);

impl<K, V> FxHashIndex<K, V>
where
    K: Hash + Eq,
{
    pub fn new() -> Self {
        Self(FxHashMap::default())
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self(FxHashMap::with_capacity_and_hasher(capacity, Default::default()))
    }

    pub fn insert(&mut self, key: K, value: V) -> Option<V> {
        self.0.insert(key, value)
    }
}

impl<K, V> FromIterator<(K, V)> for FxHashIndex<K, V>
where
    K: Hash + Eq,
{
    fn from_iter<I: IntoIterator<Item = (K, V)>>(iter: I) -> Self {
        Self(iter.into_iter().collect())
    }
}

impl<K, V> HotIndex<K, V> for FxHashIndex<K, V>
where
    K: Hash + Eq + Send + Sync,
    V: Send + Sync,
{
    fn get<Q>(&self, key: &Q) -> Option<&V>
    where
        K: Borrow<Q>,
        Q: ?Sized + Hash + Eq,
    {
        self.0.get(key)
    }

    fn len(&self) -> usize {
        self.0.len()
    }
}

/// Atomic publish-once wrapper.
///
/// Readers see a consistent snapshot of the inner value at the moment
/// they call [`load`](Self::load). Writers replace the snapshot wholesale
/// via [`swap`](Self::swap); in-flight readers continue against the
/// previous version until they drop their guards.
///
/// `T` doesn't have to implement [`HotIndex`]  `HotSwap` works for any
/// value. The intended use is to wrap an immutable index built by a
/// nightly batch, then swap it on rebuild.
pub struct HotSwap<T> {
    inner: ArcSwap<T>,
}

impl<T> HotSwap<T> {
    pub fn new(initial: T) -> Self {
        Self {
            inner: ArcSwap::from_pointee(initial),
        }
    }

    /// Borrow the live snapshot. Cheap (a single atomic load); does not
    /// block writers.
    pub fn load(&self) -> Guard<Arc<T>> {
        self.inner.load()
    }

    /// Take a long-lived owned reference to the live snapshot. Use when
    /// you need an `Arc<T>` that outlives the calling stack frame 
    /// e.g. cloning into a spawned task.
    pub fn load_full(&self) -> Arc<T> {
        self.inner.load_full()
    }

    /// Atomically replace the live snapshot. Returns the previous one;
    /// it stays alive until the last outstanding reader drops its
    /// reference, then is dropped automatically.
    pub fn swap(&self, new: T) -> Arc<T> {
        self.inner.swap(Arc::new(new))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn fx_hash_index_basic() {
        let mut idx = FxHashIndex::<String, u32>::new();
        idx.insert("a".to_string(), 1);
        assert_eq!(idx.get("a"), Some(&1));
        assert!(idx.contains("a"));
        assert!(!idx.contains("b"));
        assert_eq!(idx.len(), 1);
        assert!(!idx.is_empty());
    }

    #[test]
    fn fx_hash_index_from_iter() {
        let idx: FxHashIndex<&str, u32> = [("a", 1), ("b", 2)].into_iter().collect();
        assert_eq!(idx.get("a"), Some(&1));
        assert_eq!(idx.get("b"), Some(&2));
        assert_eq!(idx.len(), 2);
    }

    #[test]
    fn hot_swap_publishes_atomically() {
        let v1: FxHashIndex<&str, u32> = [("a", 1)].into_iter().collect();
        let swap = HotSwap::new(v1);
        assert_eq!(swap.load().get("a"), Some(&1));

        let v2: FxHashIndex<&str, u32> = [("a", 2), ("b", 3)].into_iter().collect();
        swap.swap(v2);
        let g = swap.load();
        assert_eq!(g.get("a"), Some(&2));
        assert_eq!(g.get("b"), Some(&3));
    }

    #[test]
    fn readers_see_monotonic_swaps() {
        // A reader concurrent with a writer should never observe a value
        // moving backwards: each load() returns either the old snapshot
        // or some snapshot newer than what it last saw.
        let swap = Arc::new(HotSwap::new(
            [("a", 0u32)].into_iter().collect::<FxHashIndex<&str, u32>>(),
        ));

        let writer_swap = swap.clone();
        let writer = thread::spawn(move || {
            for i in 1..1000 {
                let new: FxHashIndex<&str, u32> = [("a", i)].into_iter().collect();
                writer_swap.swap(new);
            }
        });

        let reader_swap = swap.clone();
        let reader = thread::spawn(move || {
            let mut last = 0u32;
            for _ in 0..1000 {
                let g = reader_swap.load();
                let v = *g.get("a").unwrap();
                assert!(v >= last, "value moved backwards: {last} -> {v}");
                last = v;
            }
        });

        writer.join().unwrap();
        reader.join().unwrap();
    }
}

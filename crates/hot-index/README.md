# hot-index

Hot-swappable in-memory lookup indexes for Rust.

## What it is

Two small primitives:

- **`HotIndex<K, V>`**  a trait describing the read surface of a lookup index (`get`, `contains`, `len`).
- **`HotSwap<T>`**  a wrapper around [`arc_swap::ArcSwap`] that lets a writer atomically replace the live value without blocking readers.

A reader's `load()` never blocks on a concurrent `swap()`. The previous snapshot stays alive until the last outstanding reader drops its guard, then is dropped automatically. Useful for any service that nightly-rebuilds a lookup table and wants zero-downtime publish: domain-availability indexes, geo-IP tables, ML feature stores, allow/blocklists, search shards.

A default implementation `FxHashIndex<K, V>` backed by `rustc-hash`'s `FxHashMap` is included.

## Persistence (features `bincode`, `rkyv`)

Two pluggable codecs share one atomic-write surface. Pick by which serialization story your value already has:

| Feature   | Bound on `T`                                       | Format characteristics                                          |
|-----------|----------------------------------------------------|-----------------------------------------------------------------|
| `bincode` | `serde::Serialize + serde::de::DeserializeOwned`   | Smaller dep tree; full materialization on load.                 |
| `rkyv`    | `rkyv::Archive + …` (all derived by `#[derive(Archive, Serialize, Deserialize)]`) | Larger dep tree; faster cold-start through framed layout. |

Enable independently or together:

```toml
[dependencies]
hot-index = { version = "0.1", features = ["bincode"] }     # or "rkyv", or both
```

Pick at the call site by which module you import:

```rust
use hot_index::{FxHashIndex, HotSwap, persistence};

// bincode path  for any serde-shaped T
let idx: FxHashIndex<String, u32> = build_index();
persistence::bincode::save("snapshot.bin", &idx)?;

let loaded: FxHashIndex<String, u32> = persistence::bincode::load("snapshot.bin")?;
let swap = HotSwap::new(loaded);
```

```rust
// rkyv path  for any T that derives rkyv::Archive
persistence::rkyv::save("snapshot.rkyv", &my_archived_struct)?;
let value: MyStruct = persistence::rkyv::load("snapshot.rkyv")?;
```

Both `save` paths write atomically through `persistence::atomic_write` (sibling tempfile + `fs::rename`), so a crash mid-write never leaves a torn file. No WAL, no replication, no transactions  this is crash-recovery for a workload whose source of truth lives upstream (the next batch run).

## What it isn't

- **Not a primary store.** The persistence feature is crash-recovery, not durability. Lose the file, lose the snapshot  you must be able to rebuild from upstream.
- **Not a builder.** This crate doesn't help you compute the index  only serve and swap it. Pair with `streaming-set-diff` or your own batch.
- **Not a mutable map.** The intended pattern is build-immutable, publish-once-per-batch. Per-key writes are an anti-pattern here; use a regular concurrent map for that workload.
- **Not HashDoS-resistant.** `FxHashMap` uses a fast non-cryptographic hasher. If your keys come from untrusted input without validation, swap in a different `HotIndex` impl.

## Example

```rust
use hot_index::{FxHashIndex, HotIndex, HotSwap};

let v1: FxHashIndex<&str, u32> = [("a", 1)].into_iter().collect();
let swap = HotSwap::new(v1);

// Reader path  cheap atomic load, never blocks.
assert_eq!(swap.load().get("a"), Some(&1));

// Writer path  build a fresh index, atomically publish.
let v2: FxHashIndex<&str, u32> = [("a", 2), ("b", 3)].into_iter().collect();
swap.swap(v2);

assert_eq!(swap.load().get("a"), Some(&2));
assert_eq!(swap.load().get("b"), Some(&3));
```

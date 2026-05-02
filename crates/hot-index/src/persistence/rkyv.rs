//! `rkyv` 0.8 codec for [`super`].
//!
//! Encoding: `rkyv::to_bytes` with the high-level API. Decoding uses
//! `rkyv::from_bytes` (full materialization with bytecheck validation).
//! Bound: `T: rkyv::Archive` plus the bevy of high-level
//! serialize/deserialize/validation traits  which the `#[derive(Archive,
//! Serialize, Deserialize)]` macros all generate for you.
//!
//! # When to prefer rkyv over bincode
//!
//! - Cold-start matters. The framed layout means decoding skips the
//!   per-field allocation cost bincode pays.
//! - You're willing to pay the larger dep surface (rkyv pulls in
//!   bytecheck, rend, ptr_meta, munge).
//!
//! # When to prefer bincode
//!
//! - Smaller dep tree.
//! - Format is more boring / easier to inspect with off-the-shelf tools.

use std::fs;
use std::io;
use std::path::Path;

use ::rkyv::api::high::{HighDeserializer, HighSerializer, HighValidator};
use ::rkyv::bytecheck::CheckBytes;
use ::rkyv::rancor::Error as RkyvError;
use ::rkyv::ser::allocator::ArenaHandle;
use ::rkyv::util::AlignedVec;
use ::rkyv::{Archive, Deserialize, Serialize};

use super::atomic_write;

/// Serialize `value` with rkyv and write atomically to `path`.
pub fn save<T, P>(path: P, value: &T) -> io::Result<()>
where
    P: AsRef<Path>,
    T: for<'a> Serialize<HighSerializer<AlignedVec, ArenaHandle<'a>, RkyvError>>,
{
    let bytes = ::rkyv::to_bytes::<RkyvError>(value)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    atomic_write(path, &bytes)
}

/// Read and rkyv-decode a value previously written by [`save`].
///
/// # Errors
///
/// - [`io::ErrorKind::NotFound`] if `path` doesn't exist.
/// - [`io::ErrorKind::InvalidData`] if the file exists but doesn't pass
///   bytecheck validation or doesn't decode (corrupt file, schema
///   mismatch).
pub fn load<T, P>(path: P) -> io::Result<T>
where
    P: AsRef<Path>,
    T: Archive,
    T::Archived: Deserialize<T, HighDeserializer<RkyvError>>
        + for<'a> CheckBytes<HighValidator<'a, RkyvError>>,
{
    let bytes = fs::read(path)?;
    ::rkyv::from_bytes::<T, RkyvError>(&bytes)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ::rkyv::{Archive, Deserialize, Serialize};
    use tempfile::tempdir;

    #[derive(Archive, Serialize, Deserialize, Debug, PartialEq)]
    struct Sample {
        name: String,
        counts: Vec<u32>,
        flag: bool,
    }

    fn sample() -> Sample {
        Sample {
            name: "apple".into(),
            counts: vec![1, 2, 3, 5, 8, 13],
            flag: true,
        }
    }

    #[test]
    fn round_trip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("snap.rkyv");
        let original = sample();
        save(&path, &original).unwrap();
        let loaded: Sample = load(&path).unwrap();
        assert_eq!(loaded, original);
    }

    #[test]
    fn save_leaves_no_temp_file_behind_on_success() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("snap.rkyv");
        save(&path, &sample()).unwrap();
        assert!(path.exists());
        let tmp = super::super::tmp_path_for(&path);
        assert!(!tmp.exists(), "temp file {tmp:?} should not remain");
    }

    #[test]
    fn load_missing_file_is_not_found() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("does-not-exist.rkyv");
        let err = load::<Sample, _>(&path).unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::NotFound, "got: {err}");
    }

    #[test]
    fn load_corrupt_bytes_is_invalid_data() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("corrupt.rkyv");
        fs::write(&path, b"definitely not a valid rkyv buffer").unwrap();
        let err = load::<Sample, _>(&path).unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::InvalidData, "got: {err}");
    }

    #[test]
    fn round_trip_through_hot_swap() {
        use crate::{FxHashIndex, HotIndex, HotSwap};

        let original: FxHashIndex<String, u32> = [
            ("apple".to_string(), 1),
            ("banana".to_string(), 2),
            ("cherry".to_string(), 3),
        ]
        .into_iter()
        .collect();

        let dir = tempdir().unwrap();
        let path = dir.path().join("idx.rkyv");
        save(&path, &original).unwrap();

        let loaded: FxHashIndex<String, u32> = load(&path).unwrap();
        let swap = HotSwap::new(loaded);

        let g = swap.load();
        assert_eq!(g.get("apple"), Some(&1));
        assert_eq!(g.get("banana"), Some(&2));
        assert_eq!(g.get("cherry"), Some(&3));
        assert_eq!(g.len(), 3);
    }
}

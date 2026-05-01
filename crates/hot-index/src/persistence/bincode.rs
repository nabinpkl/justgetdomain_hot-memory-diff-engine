//! `bincode` 2 codec for [`super`].
//!
//! Encoding: `bincode::config::standard()` via the `serde` integration
//! layer. Bound: `T: serde::Serialize + serde::de::DeserializeOwned`.
//! Decoding fully materializes the value (no zero-copy view).

use std::fs;
use std::io;
use std::path::Path;

use ::bincode::config;
use ::bincode::serde::{decode_from_slice, encode_to_vec};
use serde::Serialize;
use serde::de::DeserializeOwned;

use super::atomic_write;

/// Serialize `value` with bincode and write atomically to `path`.
pub fn save<T: Serialize, P: AsRef<Path>>(path: P, value: &T) -> io::Result<()> {
    let bytes = encode_to_vec(value, config::standard())
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    atomic_write(path, &bytes)
}

/// Read and bincode-decode a value previously written by [`save`].
///
/// # Errors
///
/// - [`io::ErrorKind::NotFound`] if `path` doesn't exist.
/// - [`io::ErrorKind::InvalidData`] if the file exists but doesn't
///   decode (corrupt file, schema mismatch).
pub fn load<T: DeserializeOwned, P: AsRef<Path>>(path: P) -> io::Result<T> {
    let bytes = fs::read(path)?;
    let (value, _consumed) = decode_from_slice(&bytes, config::standard())
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use tempfile::tempdir;

    #[derive(Debug, PartialEq, Serialize, Deserialize)]
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
        let path = dir.path().join("snap.bin");
        let original = sample();
        save(&path, &original).unwrap();
        let loaded: Sample = load(&path).unwrap();
        assert_eq!(loaded, original);
    }

    #[test]
    fn save_leaves_no_temp_file_behind_on_success() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("snap.bin");
        save(&path, &sample()).unwrap();
        assert!(path.exists());
        let tmp = super::super::tmp_path_for(&path);
        assert!(!tmp.exists(), "temp file {tmp:?} should not remain");
    }

    #[test]
    fn load_missing_file_is_not_found() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("does-not-exist.bin");
        let err = load::<Sample, _>(&path).unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::NotFound, "got: {err}");
    }

    #[test]
    fn load_corrupt_bytes_is_invalid_data() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("corrupt.bin");
        fs::write(&path, b"this is not bincode at all").unwrap();
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
        let path = dir.path().join("idx.bin");
        save(&path, &original).unwrap();

        let loaded: FxHashIndex<String, u32> = load(&path).unwrap();
        let swap = HotSwap::new(loaded);

        let g = swap.load();
        assert_eq!(g.get("apple"), Some(&1));
        assert_eq!(g.get("banana"), Some(&2));
        assert_eq!(g.get("cherry"), Some(&3));
        assert_eq!(g.len(), 3);
    }

    #[test]
    fn overwrite_existing_snapshot() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("snap.bin");
        save(&path, &sample()).unwrap();

        let updated = Sample {
            name: "banana".into(),
            counts: vec![100],
            flag: false,
        };
        save(&path, &updated).unwrap();

        let loaded: Sample = load(&path).unwrap();
        assert_eq!(loaded, updated);
    }
}

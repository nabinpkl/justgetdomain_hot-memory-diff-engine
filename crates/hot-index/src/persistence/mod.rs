//! Pluggable RDB-style snapshot persistence.
//!
//! One shared atomic-write helper, [`atomic_write`], plus codec-specific
//! `save` / `load` modules behind Cargo features:
//!
//! - [`bincode`] (feature `bincode`)  for any `T: serde::Serialize +
//!   serde::de::DeserializeOwned`. Smaller dep surface; full
//!   materialization on load.
//! - [`rkyv`] (feature `rkyv`)  for any `T: rkyv::Archive + …`. Larger
//!   dep surface; faster cold-start through zero-copy framing.
//!
//! The two codecs are independent and can be enabled together; pick at
//! the call site by which module's `save` / `load` you import.
//!
//! # When to use
//!
//! Crash-recovery for an in-memory index whose source of truth lives
//! upstream (e.g. a nightly batch input). The snapshot lets the process
//! serve immediately on restart instead of waiting for the next batch.
//!
//! # When not to use
//!
//! As a primary store. There is no WAL, no replication, no transactions.
//! Lose the file, lose the snapshot  you must be able to rebuild from
//! upstream.
//!
//! # Concurrency
//!
//! [`atomic_write`] uses a fixed `<path>.tmp` sibling. Concurrent saves
//! to the same path will stomp each other's tempfile. The `hot-index`
//! workflow is single-writer (one batch at a time), which matches.

use std::fs;
use std::io;
use std::path::Path;

#[cfg(feature = "bincode")]
pub mod bincode;

#[cfg(feature = "rkyv")]
pub mod rkyv;

/// Write `bytes` to `path` atomically: encode → write to `<path>.tmp`
/// → `fs::rename` to `path`.
///
/// The rename is atomic on POSIX file systems within the same
/// directory, so a crash during the write phase leaves `path` untouched
/// and a crash during the rename either fully succeeds or fully fails
/// (no torn file).
pub fn atomic_write<P: AsRef<Path>>(path: P, bytes: &[u8]) -> io::Result<()> {
    let path = path.as_ref();
    let tmp = tmp_path_for(path);
    fs::write(&tmp, bytes)?;
    fs::rename(&tmp, path)?;
    Ok(())
}

pub(crate) fn tmp_path_for(path: &Path) -> std::path::PathBuf {
    let mut s = path.as_os_str().to_owned();
    s.push(".tmp");
    s.into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn atomic_write_creates_file_at_final_path() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("snap.bin");
        atomic_write(&path, b"hello world").unwrap();
        assert!(path.exists());
        assert_eq!(fs::read(&path).unwrap(), b"hello world");
    }

    #[test]
    fn atomic_write_leaves_no_tempfile_on_success() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("snap.bin");
        atomic_write(&path, b"data").unwrap();
        let tmp = tmp_path_for(&path);
        assert!(!tmp.exists(), "tempfile {tmp:?} should not remain");
    }

    #[test]
    fn atomic_write_overwrites_existing_file() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("snap.bin");
        atomic_write(&path, b"first").unwrap();
        atomic_write(&path, b"second").unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"second");
    }
}

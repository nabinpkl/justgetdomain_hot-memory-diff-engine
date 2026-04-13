use rkyv::{Archive, Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;

#[derive(Archive, Serialize, Deserialize, Debug, PartialEq)]
#[rkyv(compare(PartialEq), derive(Debug))]
pub struct Snapshot {
    pub all_tlds: Vec<String>,
    pub entries: Vec<SnapshotEntry>,
}

#[derive(Archive, Serialize, Deserialize, Debug, PartialEq)]
#[rkyv(compare(PartialEq), derive(Debug))]
pub struct SnapshotEntry {
    pub word: String,
    pub registered_tlds: Vec<String>,
}

/// Serialize snapshot to file. Writes to a temp file first, then atomically
/// renames to prevent corruption from crashes mid-write.
pub fn save(path: &Path, snapshot: &Snapshot) -> io::Result<()> {
    let bytes = rkyv::to_bytes::<rkyv::rancor::Error>(snapshot)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, &bytes)?;
    fs::rename(&tmp_path, path)?;
    Ok(())
}

/// Load snapshot from file. Reads the full file and deserializes.
pub fn load(path: &Path) -> io::Result<Snapshot> {
    let bytes = fs::read(path)?;
    let snapshot = rkyv::from_bytes::<Snapshot, rkyv::rancor::Error>(&bytes)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
    Ok(snapshot)
}

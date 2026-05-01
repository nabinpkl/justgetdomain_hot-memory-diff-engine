//! On-disk transfer object between the batch and the index builder.
//!
//! Persistence (atomic write + read) lives in [`hot_index::persistence::rkyv`].
//! Callers serialize/deserialize this type directly through that module.

use rkyv::{Archive, Deserialize, Serialize};

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

//! Domain-availability scanner: thin domain layer over `streaming-set-diff`.
//!
//! Wraps the library's two algorithms (linear and binary-search) behind
//! the same [`ScannerKind`] enum the rest of the example uses for its
//! A/B comparison. The only domain-specific code here is the line parser
//! ([`DomainParser`])  TLD validation rules that mirror what was inlined
//! in the previous bespoke scanner.

use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufReader};
use std::path::Path;
use std::time::Instant;

use memmap2::Mmap;
use rustc_hash::FxHashSet;
use serde::{Deserialize, Serialize};
use streaming_set_diff::{LineParser, diff, diff_sorted};

/// Per-candidate scan result.
pub struct ScanResult {
    pub word: String,
    pub registered_tlds: Vec<String>,
}

/// Full output from a scan: per-word results + all unique TLDs seen.
pub struct ScanOutput {
    pub results: Vec<ScanResult>,
    pub all_tlds: Vec<String>,
}

/// Which scanning algorithm to run. Swappable at runtime via config so
/// we can A/B two algorithms against the same input and record both
/// timings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScannerKind {
    /// Sort-aware: binary-search the mmap'd file per candidate.
    /// O(k · log n + matches).
    Binary,
    /// Naive: walk every line, check candidate membership.
    /// O(n) regardless of candidate set size.
    Linear,
}

impl ScannerKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            ScannerKind::Binary => "binary",
            ScannerKind::Linear => "linear",
        }
    }
}

impl std::str::FromStr for ScannerKind {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.trim().to_ascii_lowercase().as_str() {
            "binary" | "binsearch" | "bsearch" => Ok(ScannerKind::Binary),
            "linear" | "scan" | "naive" => Ok(ScannerKind::Linear),
            other => Err(format!("unknown scanner '{other}' (expected 'binary' or 'linear')")),
        }
    }
}

/// Domain-line parser: `name.tld` → key=`name`, value=`tld` after
/// validation. Validation rules:
/// - `name` must be valid UTF-8 up to the first `.`.
/// - `tld` must be non-empty, contain no ASCII digits, no further `.`,
///   and decode as UTF-8.
struct DomainParser;

impl LineParser for DomainParser {
    type Value = String;

    fn parse_key<'a>(&self, line: &'a [u8]) -> Option<&'a str> {
        let dot = line.iter().position(|&b| b == b'.')?;
        std::str::from_utf8(&line[..dot]).ok()
    }

    fn parse_value(&self, line: &[u8]) -> Option<String> {
        let dot = line.iter().position(|&b| b == b'.')?;
        let tld_bytes = &line[dot + 1..];
        let tld = std::str::from_utf8(tld_bytes).ok()?.trim_end();
        if tld.is_empty() || tld.bytes().any(|b| b.is_ascii_digit()) || tld.contains('.') {
            return None;
        }
        Some(tld.to_string())
    }

    /// Append the dot delimiter so the binary search lands at the start
    /// of the candidate's `name.tld` cluster, not somewhere in the
    /// preceding `name-sibling.tld` block (`-` < `.` in ASCII).
    fn candidate_search_prefix(&self, candidate: &str) -> Vec<u8> {
        let mut v = candidate.as_bytes().to_vec();
        v.push(b'.');
        v
    }
}

/// Public entry  dispatch to the requested algorithm in the library.
/// Both impls are interchangeable: identical [`ScanOutput`] semantics,
/// same TLD filtering rules.
pub fn scan(
    kind: ScannerKind,
    path: &Path,
    candidates: &FxHashSet<String>,
) -> io::Result<ScanOutput> {
    let start = Instant::now();
    let result = match kind {
        ScannerKind::Linear => {
            let file = File::open(path)?;
            let reader = BufReader::new(file);
            diff(reader, &DomainParser, candidates)?
        }
        ScannerKind::Binary => {
            let file = File::open(path)?;
            let mmap = unsafe { Mmap::map(&file)? };
            diff_sorted(&mmap[..], &DomainParser, candidates)
        }
    };
    let elapsed = start.elapsed();

    let output = into_scan_output(result);
    eprintln!(
        "[done] {} scan: {} candidates → {} matched, {} unique TLDs in {:.2}s",
        kind.as_str(),
        candidates.len(),
        output.results.iter().filter(|r| !r.registered_tlds.is_empty()).count(),
        output.all_tlds.len(),
        elapsed.as_secs_f64(),
    );
    Ok(output)
}

/// Rotate a [`streaming_set_diff::DiffResult`] into a [`ScanOutput`]:
/// flatten matched buckets, derive the unique-TLD set, sort
/// alphabetically (stable downstream contract for the snapshot).
fn into_scan_output(diff: streaming_set_diff::DiffResult<String>) -> ScanOutput {
    let mut all_tlds_set: FxHashSet<String> = FxHashSet::default();
    let mut by_word: HashMap<String, Vec<String>> = diff.matches;

    for tlds in by_word.values() {
        for tld in tlds {
            if !all_tlds_set.contains(tld.as_str()) {
                all_tlds_set.insert(tld.clone());
            }
        }
    }

    let mut results: Vec<ScanResult> = by_word
        .drain()
        .map(|(word, registered_tlds)| ScanResult { word, registered_tlds })
        .collect();
    results.sort_by(|a, b| a.word.cmp(&b.word));

    let mut all_tlds: Vec<String> = all_tlds_set.into_iter().collect();
    all_tlds.sort();

    ScanOutput { results, all_tlds }
}

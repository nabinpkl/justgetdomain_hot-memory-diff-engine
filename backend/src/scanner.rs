use memmap2::Mmap;
use rustc_hash::{FxHashMap, FxHashSet};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io;
use std::path::Path;
use std::time::Instant;

/// Result for a single candidate word found in the domain file.
pub struct ScanResult {
    pub word: String,
    pub registered_tlds: Vec<String>,
}

/// Full output from a scan: per-word results + all unique TLDs seen.
pub struct ScanOutput {
    pub results: Vec<ScanResult>,
    pub all_tlds: Vec<String>,
}

/// Which scanning algorithm to run. Swappable at runtime via config so we
/// can A/B two algorithms against the same 5.6 GB input and record both
/// timings — the point being that exploiting the sort order turns minutes
/// into seconds.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScannerKind {
    /// Sort-aware: binary-search the mmap'd file for each candidate prefix.
    /// O(k · (log n + t)).
    Binary,
    /// Naive: walk every line, check candidate membership, aggregate.
    /// O(n) regardless of candidate set size — ignores that the file is sorted.
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

/// Public entry — dispatch to the requested implementation. Both impls are
/// interchangeable: identical `ScanOutput` semantics, mmap'd input, same
/// TLD filtering rules. Only the algorithm differs.
pub fn scan(
    kind: ScannerKind,
    path: &Path,
    candidates: &FxHashSet<String>,
) -> io::Result<ScanOutput> {
    match kind {
        ScannerKind::Binary => scan_binary(path, candidates),
        ScannerKind::Linear => scan_linear(path, candidates),
    }
}

/// Binary-search the sorted domain file for each candidate word.
///
/// Instead of reading 319M lines, we mmap the file and binary-search
/// for each of the ~8,654 candidates. For each candidate found, we read
/// forward to collect all its registered TLDs.
///
/// Complexity: O(k * (log(n) + t)) where k = candidates, n = file size,
/// t = average TLDs per word. Typically seconds instead of minutes.
fn scan_binary(
    path: &Path,
    candidates: &FxHashSet<String>,
) -> io::Result<ScanOutput> {
    let file = File::open(path)?;
    let mmap = unsafe { Mmap::map(&file)? };
    let data = &mmap[..];

    let start = Instant::now();

    // Sort candidates for ordered output
    let mut sorted_candidates: Vec<&str> = candidates.iter().map(|s| s.as_str()).collect();
    sorted_candidates.sort();

    let mut results: Vec<ScanResult> = Vec::new();
    let mut all_tlds_set: FxHashSet<String> = FxHashSet::default();

    for (i, &candidate) in sorted_candidates.iter().enumerate() {
        if (i + 1) % 1000 == 0 {
            eprintln!(
                "[progress] {}/{} candidates searched | {:.1}s",
                i + 1,
                sorted_candidates.len(),
                start.elapsed().as_secs_f64(),
            );
        }

        // Binary search: find any line starting with "candidate."
        let prefix = format!("{}.", candidate);
        let Some(hit_pos) = binary_search_prefix(data, prefix.as_bytes()) else {
            continue; // candidate not in file at all
        };

        // Walk backward to find the first line with this prefix
        let group_start = find_group_start(data, hit_pos, prefix.as_bytes());

        // Read forward collecting all TLDs for this candidate
        let mut tlds: Vec<String> = Vec::new();
        let mut pos = group_start;

        while pos < data.len() {
            let line_end = memchr_newline(data, pos);
            let line = &data[pos..line_end];

            if !line.starts_with(prefix.as_bytes()) {
                break; // past this candidate's group
            }

            // Extract TLD (everything after the prefix)
            let tld = &line[prefix.len()..];
            if let Ok(tld_str) = std::str::from_utf8(tld) {
                let tld_str = tld_str.trim_end();
                if !tld_str.is_empty()
                    && !tld_str.bytes().any(|b| b.is_ascii_digit())
                    && !tld_str.contains('.')
                {
                    if !all_tlds_set.contains(tld_str) {
                        all_tlds_set.insert(tld_str.to_string());
                    }
                    tlds.push(tld_str.to_string());
                }
            }

            pos = skip_past_newline(data, line_end);
        }

        results.push(ScanResult {
            word: candidate.to_string(),
            registered_tlds: tlds,
        });
    }

    let mut all_tlds: Vec<String> = all_tlds_set.into_iter().collect();
    all_tlds.sort();

    let elapsed = start.elapsed();
    eprintln!(
        "[done] {} candidates searched in {:.2}s | {} matched | {} unique TLDs",
        sorted_candidates.len(),
        elapsed.as_secs_f64(),
        results.iter().filter(|r| !r.registered_tlds.is_empty()).count(),
        all_tlds.len(),
    );

    Ok(ScanOutput { results, all_tlds })
}

/// Binary search the mmap'd file for any line starting with `prefix`.
/// Returns the byte offset of a matching line, or None.
fn binary_search_prefix(data: &[u8], prefix: &[u8]) -> Option<usize> {
    let mut lo: usize = 0;
    let mut hi: usize = data.len();
    let mut result: Option<usize> = None;

    while lo < hi {
        let mid = lo + (hi - lo) / 2;

        // Snap to start of the line containing `mid`
        let line_start = snap_to_line_start(data, mid);
        let line_end = memchr_newline(data, line_start);
        let line = &data[line_start..line_end];

        if line.starts_with(prefix) {
            result = Some(line_start);
            hi = line_start; // keep searching left for the first match
        } else if line < prefix {
            lo = skip_past_newline(data, line_end);
        } else {
            hi = line_start;
        }
    }

    result
}

/// Walk backward from `pos` to find the first line with the given prefix.
fn find_group_start(data: &[u8], mut pos: usize, prefix: &[u8]) -> usize {
    loop {
        if pos == 0 {
            return 0;
        }
        // Go to previous line
        let prev_end = pos.saturating_sub(1); // skip the \n before current line
        let prev_start = snap_to_line_start(data, prev_end);
        let prev_line = &data[prev_start..pos.saturating_sub(1).min(memchr_newline(data, prev_start))];

        if prev_line.starts_with(prefix) {
            pos = prev_start;
        } else {
            return pos;
        }
    }
}

/// Find the start of the line containing byte offset `pos`.
#[inline]
fn snap_to_line_start(data: &[u8], pos: usize) -> usize {
    if pos == 0 {
        return 0;
    }
    // Search backward for \n
    let mut i = pos.min(data.len() - 1);
    while i > 0 && data[i - 1] != b'\n' {
        i -= 1;
    }
    i
}

/// Find the end of the line starting at `pos` (position of \n or end of data).
#[inline]
fn memchr_newline(data: &[u8], pos: usize) -> usize {
    let mut i = pos;
    while i < data.len() && data[i] != b'\n' {
        i += 1;
    }
    i
}

/// Skip past the newline at `pos`, returning the start of the next line.
#[inline]
fn skip_past_newline(data: &[u8], pos: usize) -> usize {
    if pos < data.len() && data[pos] == b'\n' {
        pos + 1
    } else {
        data.len()
    }
}

/// Naive linear scan. Mmaps the file and walks every line regardless of
/// where candidates sit. Kept intentionally simple — the whole point is to
/// contrast against the sort-aware binary search. Same input, same output,
/// dramatically different wall time.
///
/// Complexity: O(n) lines × O(1) candidate lookup. For a 5.6 GB / 319M-line
/// file this is minutes. The binary-search variant is seconds.
fn scan_linear(
    path: &Path,
    candidates: &FxHashSet<String>,
) -> io::Result<ScanOutput> {
    let file = File::open(path)?;
    let mmap = unsafe { Mmap::map(&file)? };
    let data = &mmap[..];

    let start = Instant::now();

    let mut per_candidate: FxHashMap<&str, Vec<String>> =
        FxHashMap::with_capacity_and_hasher(candidates.len(), Default::default());
    let mut all_tlds_set: FxHashSet<String> = FxHashSet::default();

    let mut pos = 0usize;
    let mut lines_seen: u64 = 0;

    while pos < data.len() {
        let line_end = memchr_newline(data, pos);
        let line = &data[pos..line_end];
        pos = skip_past_newline(data, line_end);
        lines_seen += 1;

        if lines_seen % 10_000_000 == 0 {
            eprintln!(
                "[progress] {lines_seen} lines scanned | {:.1}s",
                start.elapsed().as_secs_f64(),
            );
        }

        // Split on the first '.' → (name, tld). Skip lines without a dot.
        let Some(dot) = line.iter().position(|&b| b == b'.') else {
            continue;
        };
        let name_bytes = &line[..dot];
        let tld_bytes = &line[dot + 1..];

        // Must be valid UTF-8 name; bail on garbage rather than crash.
        let Ok(name) = std::str::from_utf8(name_bytes) else {
            continue;
        };

        // Only pay the TLD-parse cost when the name is a candidate.
        let Some(key) = candidates.get(name) else {
            continue;
        };

        let Ok(tld) = std::str::from_utf8(tld_bytes) else {
            continue;
        };
        let tld = tld.trim_end();
        if tld.is_empty()
            || tld.bytes().any(|b| b.is_ascii_digit())
            || tld.contains('.')
        {
            continue;
        }

        if !all_tlds_set.contains(tld) {
            all_tlds_set.insert(tld.to_string());
        }
        per_candidate
            .entry(key.as_str())
            .or_insert_with(Vec::new)
            .push(tld.to_string());
    }

    // Emit results in the same alphabetical order as the binary impl.
    let mut results: Vec<ScanResult> = per_candidate
        .into_iter()
        .map(|(word, tlds)| ScanResult {
            word: word.to_string(),
            registered_tlds: tlds,
        })
        .collect();
    results.sort_by(|a, b| a.word.cmp(&b.word));

    let mut all_tlds: Vec<String> = all_tlds_set.into_iter().collect();
    all_tlds.sort();

    let elapsed = start.elapsed();
    eprintln!(
        "[done] linear scan: {lines_seen} lines in {:.2}s | {} matched | {} unique TLDs",
        elapsed.as_secs_f64(),
        results.iter().filter(|r| !r.registered_tlds.is_empty()).count(),
        all_tlds.len(),
    );

    Ok(ScanOutput { results, all_tlds })
}

use memmap2::Mmap;
use rustc_hash::FxHashSet;
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

/// Binary-search the sorted domain file for each candidate word.
///
/// Instead of reading 319M lines, we mmap the file and binary-search
/// for each of the ~8,654 candidates. For each candidate found, we read
/// forward to collect all its registered TLDs.
///
/// Complexity: O(k * (log(n) + t)) where k = candidates, n = file size,
/// t = average TLDs per word. Typically seconds instead of minutes.
pub fn scan_domains(
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

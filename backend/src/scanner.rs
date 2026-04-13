use rustc_hash::FxHashSet;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
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

/// Stream the sorted domain file, collecting registered TLDs for each candidate word.
///
/// The file must be sorted alphabetically (full domain strings). This guarantees
/// all entries for a given name are consecutive. We split each line on the first
/// '.' to get (name, tld), group by name, and check against the candidate set.
///
/// Also collects every unique TLD encountered in the file.
pub fn scan_domains(
    path: &Path,
    candidates: &FxHashSet<String>,
) -> io::Result<ScanOutput> {
    let file = File::open(path)?;
    let mut reader = BufReader::with_capacity(64 * 1024, file);

    let mut results: Vec<ScanResult> = Vec::new();
    let mut all_tlds_set: FxHashSet<String> = FxHashSet::default();
    let mut line_buf = String::new();
    let mut current_name = String::new();
    let mut current_tlds: Vec<String> = Vec::new();
    let mut lines_processed: u64 = 0;
    let start = Instant::now();

    loop {
        line_buf.clear();
        let bytes_read = reader.read_line(&mut line_buf)?;
        if bytes_read == 0 {
            break; // EOF
        }

        lines_processed += 1;
        if lines_processed % 10_000_000 == 0 {
            let elapsed = start.elapsed().as_secs_f64();
            let rate = lines_processed as f64 / elapsed;
            eprintln!(
                "[progress] {}M lines | {:.1}s | {:.0} lines/sec",
                lines_processed / 1_000_000,
                elapsed,
                rate,
            );
        }

        let line = line_buf.trim_end();
        if line.is_empty() {
            continue;
        }

        // Split on first '.' → (name, tld)
        let Some(dot_pos) = line.find('.') else {
            continue; // no dot, skip
        };
        let name = &line[..dot_pos];
        let tld = &line[dot_pos + 1..];

        if name != current_name {
            // Flush previous group
            if !current_name.is_empty() && candidates.contains(&current_name) {
                results.push(ScanResult {
                    word: std::mem::take(&mut current_name),
                    registered_tlds: std::mem::take(&mut current_tlds),
                });
            }
            current_name.clear();
            current_name.push_str(name);
            current_tlds.clear();
        }

        if !all_tlds_set.contains(tld) {
            all_tlds_set.insert(tld.to_string());
        }
        current_tlds.push(tld.to_string());
    }

    // Flush final group
    if !current_name.is_empty() && candidates.contains(&current_name) {
        results.push(ScanResult {
            word: current_name,
            registered_tlds: current_tlds,
        });
    }

    let mut all_tlds: Vec<String> = all_tlds_set.into_iter().collect();
    all_tlds.sort();

    let elapsed = start.elapsed().as_secs_f64();
    eprintln!(
        "[done] {} lines in {:.1}s ({:.0} lines/sec) | {} candidates matched | {} unique TLDs",
        lines_processed,
        elapsed,
        lines_processed as f64 / elapsed,
        results.len(),
        all_tlds.len(),
    );

    Ok(ScanOutput { results, all_tlds })
}

use clap::Parser;
use justgetdomain::dictionary;
use justgetdomain::scanner;
use justgetdomain::snapshot::{self, Snapshot, SnapshotEntry};
use std::io::{self, Write};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "batch", about = "Scan domain file and find available dictionary words")]
struct Args {
    /// Path to the sorted domain data file
    #[arg(long, default_value = "data/domains.txt")]
    data: PathBuf,

    /// Path to write the snapshot file
    #[arg(long, default_value = "data/snapshot.bin")]
    output: PathBuf,
}

fn main() {
    let args = Args::parse();

    eprintln!("[batch] loading dictionary...");
    let candidates = dictionary::load_candidates();
    eprintln!("[batch] {} candidate words loaded", candidates.len());

    eprintln!("[batch] scanning {}...", args.data.display());
    let scan_output = scanner::scan_domains(&args.data, &candidates)
        .expect("failed to scan domain file");

    let mut results = scan_output.results;

    // Sort by fewest registered TLDs (most available first)
    results.sort_by_key(|r| r.registered_tlds.len());

    // Print results to stdout
    let stdout = std::io::stdout();
    let mut out = std::io::BufWriter::new(stdout.lock());
    let mut write_output = || -> io::Result<()> {
        writeln!(out, "{:<20} {:>10} {}", "WORD", "REGISTERED", "TLDS (registered)")?;
        writeln!(out, "{}", "-".repeat(80))?;

        for result in &results {
            let tld_sample: String = result
                .registered_tlds
                .iter()
                .take(10)
                .cloned()
                .collect::<Vec<_>>()
                .join(", ");
            let suffix = if result.registered_tlds.len() > 10 {
                format!(", ... (+{})", result.registered_tlds.len() - 10)
            } else {
                String::new()
            };
            writeln!(
                out,
                "{:<20} {:>10} {}{}",
                result.word,
                result.registered_tlds.len(),
                tld_sample,
                suffix,
            )?;
        }
        Ok(())
    };
    if let Err(e) = write_output() {
        if e.kind() != io::ErrorKind::BrokenPipe {
            eprintln!("[batch] write error: {e}");
        }
    }

    eprintln!(
        "\n[batch] {} words found in domain file out of {} candidates",
        results.len(),
        candidates.len(),
    );

    // Build snapshot: include all candidates, even those with zero registrations
    let matched_words: rustc_hash::FxHashSet<String> =
        results.iter().map(|r| r.word.clone()).collect();

    let mut entries: Vec<SnapshotEntry> = results
        .into_iter()
        .map(|r| SnapshotEntry {
            word: r.word,
            registered_tlds: r.registered_tlds,
        })
        .collect();

    // Add candidates not found in the domain file (fully available)
    let mut zero_reg_count = 0;
    for candidate in &candidates {
        if !matched_words.contains(candidate) {
            entries.push(SnapshotEntry {
                word: candidate.clone(),
                registered_tlds: Vec::new(),
            });
            zero_reg_count += 1;
        }
    }
    entries.sort_by(|a, b| a.word.cmp(&b.word));

    eprintln!(
        "[batch] {} words with zero registrations (fully available)",
        zero_reg_count,
    );

    let snapshot = Snapshot {
        all_tlds: scan_output.all_tlds,
        entries,
    };

    eprintln!("[batch] writing snapshot to {}...", args.output.display());
    snapshot::save(&args.output, &snapshot).expect("failed to write snapshot");

    // Verify by loading it back
    let loaded = snapshot::load(&args.output).expect("failed to load snapshot");
    assert_eq!(loaded.entries.len(), snapshot.entries.len());
    assert_eq!(loaded.all_tlds.len(), snapshot.all_tlds.len());

    let file_size = std::fs::metadata(&args.output)
        .map(|m| m.len())
        .unwrap_or(0);
    eprintln!(
        "[batch] snapshot saved: {} entries, {} TLDs, {:.1} KB",
        loaded.entries.len(),
        loaded.all_tlds.len(),
        file_size as f64 / 1024.0,
    );
}

use clap::Parser;
use domain_availability::batch_runner;
use domain_availability::scanner::ScannerKind;
use domain_availability::snapshot::Snapshot;
use hot_index::persistence;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::time::Instant;

#[derive(Parser)]
#[command(
    name = "domain-scan",
    about = "Diff a candidate dictionary against a sorted registered-domains file \
             and write out the available set as a snapshot. Supports two scan \
             algorithms (binary, linear) for side-by-side timing comparison."
)]
struct Args {
    /// Path to the sorted domain data file (post-extract)
    #[arg(long, default_value = "data/domains.txt")]
    data: PathBuf,

    /// Path to write the snapshot file
    #[arg(long, default_value = "data/snapshot.bin")]
    output: PathBuf,

    /// Scan algorithm: `binary` (sort-aware, seconds) or `linear` (naive
    /// full scan, minutes). Both produce identical snapshots  use this to
    /// capture side-by-side timings.
    #[arg(long, default_value = "binary")]
    scanner: ScannerKind,
}

fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();

    eprintln!(
        "[domain-scan] building available domains snapshot from {} using {} scanner",
        args.data.display(),
        args.scanner.as_str(),
    );
    let scan_start = Instant::now();
    let snapshot = batch_runner::build_snapshot(&args.data, args.scanner)?;
    let scan_elapsed = scan_start.elapsed();

    eprintln!("[domain-scan] writing snapshot to {}", args.output.display());
    persistence::rkyv::save(&args.output, &snapshot)?;

    let loaded: Snapshot = persistence::rkyv::load(&args.output)?;
    assert_eq!(loaded.entries.len(), snapshot.entries.len());
    assert_eq!(loaded.all_tlds.len(), snapshot.all_tlds.len());

    let file_size = std::fs::metadata(&args.output)
        .map(|m| m.len())
        .unwrap_or(0);
    eprintln!(
        "[domain-scan] snapshot saved: {} entries, {} TLDs, {:.1} KB | scanner={} scan_elapsed={:.2}s",
        loaded.entries.len(),
        loaded.all_tlds.len(),
        file_size as f64 / 1024.0,
        args.scanner.as_str(),
        scan_elapsed.as_secs_f64(),
    );

    // SHA256 of the snapshot bytes. Different scanner algorithms must produce
    // byte-identical snapshots  printing the hash side by side in the screenshot
    // is the proof, not just that file sizes match.
    let bytes = std::fs::read(&args.output)?;
    let hash = Sha256::digest(&bytes);
    let hex: String = hash.iter().map(|b| format!("{:02x}", b)).collect();
    eprintln!("[domain-scan] snapshot sha256: {}", hex);
    Ok(())
}

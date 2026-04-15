use clap::Parser;
use justgetdomain::batch_runner;
use justgetdomain::snapshot;
use std::path::PathBuf;

#[derive(Parser)]
#[command(
    name = "batch",
    about = "Scan an existing domains.txt against the candidate dictionary \
             and write a snapshot. Meant for manual runs — the server runs \
             the scheduled batch automatically, including download + extract."
)]
struct Args {
    /// Path to the sorted domain data file (post-extract)
    #[arg(long, default_value = "data/domains.txt")]
    data: PathBuf,

    /// Path to write the snapshot file
    #[arg(long, default_value = "data/snapshot.bin")]
    output: PathBuf,
}

fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();

    eprintln!("[batch] building snapshot from {}", args.data.display());
    let snapshot = batch_runner::build_snapshot(&args.data)?;

    eprintln!("[batch] writing snapshot to {}", args.output.display());
    snapshot::save(&args.output, &snapshot)?;

    let loaded = snapshot::load(&args.output)?;
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
    Ok(())
}

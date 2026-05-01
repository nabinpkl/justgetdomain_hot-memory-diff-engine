use std::fs::File;
use std::path::PathBuf;

use anyhow::{Context, Result};
use breach_password_check::check_passwords;
use clap::Parser;
use memmap2::Mmap;
use rustc_hash::FxHashSet;

#[derive(Parser)]
#[command(
    name = "breach-password-check",
    about = "Check candidate password hashes against a sorted HIBP-style corpus.\n\
             The corpus must be lines of `<HASH>:<COUNT>` sorted by HASH."
)]
struct Args {
    /// Path to the sorted HIBP-style corpus file (`HASH:COUNT` per line).
    #[arg(long)]
    corpus: PathBuf,

    /// Path to candidates file (one SHA-1 hex hash per line).
    #[arg(long)]
    candidates: PathBuf,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let candidates_text = std::fs::read_to_string(&args.candidates)
        .with_context(|| format!("read candidates {}", args.candidates.display()))?;
    let candidates: FxHashSet<String> = candidates_text
        .lines()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .collect();

    let file = File::open(&args.corpus)
        .with_context(|| format!("open corpus {}", args.corpus.display()))?;
    let mmap = unsafe { Mmap::map(&file).context("mmap corpus")? };

    eprintln!(
        "[breach-check] {} candidates against {} bytes of corpus",
        candidates.len(),
        mmap.len(),
    );

    let result = check_passwords(&mmap[..], &candidates);

    let mut sorted_candidates: Vec<&String> = candidates.iter().collect();
    sorted_candidates.sort();
    for hash in sorted_candidates {
        match result.matches.get(hash) {
            Some(counts) => {
                let total: u32 = counts.iter().sum();
                println!("{hash}  pwned: {total} times");
            }
            None => {
                println!("{hash}  not found");
            }
        }
    }

    eprintln!(
        "[breach-check] {} matched, {} not found",
        result.matched_count(),
        result.unmatched_count(),
    );

    Ok(())
}

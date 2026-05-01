//! Throughput benches for `diff` (linear) and `diff_sorted` (binary-search).
//!
//! Synthetic sorted corpus generated at bench time: lines are
//! `<name>.<tld>` with `name` a random lowercase string and `tld` from
//! a small set. Same input, two algorithms, byte-identical output —
//! the headline number is the speed ratio at scale.
//!
//! Throughput is reported as `Throughput::Bytes(corpus_len)` for both
//! algorithms. For `diff` this is honest (it actually reads every byte).
//! For `diff_sorted` it's the *apparent* throughput from the user's
//! perspective — same input scale, much less wall time, much higher
//! reported MB/s. That ratio is the point.
//!
//! Run with `cargo bench -p streaming-set-diff`. Add `--features
//! long-bench` for a 10M-line corpus (slow — minutes per group).

use std::io::Cursor;

use criterion::{
    BenchmarkId, Criterion, Throughput, black_box, criterion_group, criterion_main,
};
use rand::rngs::StdRng;
use rand::seq::SliceRandom;
use rand::{Rng, SeedableRng};
use rustc_hash::FxHashSet;
use streaming_set_diff::{LineParser, diff, diff_sorted};

#[cfg(not(feature = "long-bench"))]
const SIZES: &[usize] = &[100_000, 1_000_000];

#[cfg(feature = "long-bench")]
const SIZES: &[usize] = &[100_000, 1_000_000, 10_000_000];

const N_CANDIDATES: usize = 10_000;
const TLDS: &[&str] = &["com", "io", "dev", "net", "org"];

/// Same parser shape as the domain-availability example uses, lifted
/// here so the bench is self-contained.
struct DotParser;

impl LineParser for DotParser {
    type Value = String;

    fn parse_key<'a>(&self, line: &'a [u8]) -> Option<&'a str> {
        let dot = line.iter().position(|&b| b == b'.')?;
        std::str::from_utf8(&line[..dot]).ok()
    }

    fn parse_value(&self, line: &[u8]) -> Option<String> {
        let dot = line.iter().position(|&b| b == b'.')?;
        std::str::from_utf8(&line[dot + 1..]).ok().map(str::to_owned)
    }
}

fn random_name(rng: &mut StdRng) -> String {
    let len = rng.gen_range(6..=12);
    (0..len).map(|_| rng.gen_range(b'a'..=b'z') as char).collect()
}

/// Generate a sorted corpus: `n_lines` total lines spread across
/// `n_lines/3` unique names (each name gets 1-5 TLDs). Returns the
/// raw byte buffer plus the unique sorted name list (used for
/// candidate sampling).
fn generate_corpus(n_lines: usize, seed: u64) -> (Vec<u8>, Vec<String>) {
    let unique = (n_lines / 3).max(1);
    let mut rng = StdRng::seed_from_u64(seed);

    let mut names: Vec<String> = (0..unique).map(|_| random_name(&mut rng)).collect();
    names.sort();
    names.dedup();

    let mut buf: Vec<u8> = Vec::with_capacity(n_lines * 16);
    let mut emitted = 0usize;
    for name in &names {
        let n_tlds = rng.gen_range(1..=TLDS.len());
        for tld in TLDS.iter().take(n_tlds) {
            buf.extend_from_slice(name.as_bytes());
            buf.push(b'.');
            buf.extend_from_slice(tld.as_bytes());
            buf.push(b'\n');
            emitted += 1;
            if emitted >= n_lines {
                return (buf, names);
            }
        }
    }
    (buf, names)
}

/// Build a candidate set: half hits (sampled from corpus names), half
/// misses (newly generated names that won't appear in the corpus).
fn generate_candidates(
    n: usize,
    corpus_names: &[String],
    seed: u64,
) -> FxHashSet<String> {
    let mut rng = StdRng::seed_from_u64(seed);
    let in_corpus: FxHashSet<&String> = corpus_names.iter().collect();

    let mut set = FxHashSet::default();
    let mut sampled: Vec<&String> = corpus_names.choose_multiple(&mut rng, n / 2).collect();
    for s in sampled.drain(..) {
        set.insert(s.clone());
    }
    while set.len() < n {
        let candidate = random_name(&mut rng);
        if !in_corpus.contains(&candidate) {
            set.insert(candidate);
        }
    }
    set
}

fn bench_throughput(c: &mut Criterion) {
    for &n_lines in SIZES {
        let (corpus, names) = generate_corpus(n_lines, 0xDEAD_BEEF);
        let candidates = generate_candidates(N_CANDIDATES, &names, 0xCAFE_F00D);

        let mut group = c.benchmark_group("throughput");
        group.throughput(Throughput::Bytes(corpus.len() as u64));
        // Heavy work per iteration; cap sample count so total runtime is
        // bounded for the larger sizes.
        group.sample_size(if n_lines >= 1_000_000 { 20 } else { 50 });

        group.bench_with_input(BenchmarkId::new("diff", n_lines), &(), |b, _| {
            b.iter(|| {
                let result = diff(Cursor::new(&corpus), &DotParser, &candidates).unwrap();
                black_box(result.matched_count())
            });
        });

        group.bench_with_input(BenchmarkId::new("diff_sorted", n_lines), &(), |b, _| {
            b.iter(|| {
                let result = diff_sorted(&corpus, &DotParser, &candidates);
                black_box(result.matched_count())
            });
        });

        group.finish();
    }
}

criterion_group!(benches, bench_throughput);
criterion_main!(benches);

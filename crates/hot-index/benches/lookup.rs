//! Lookup latency benches: FxHashIndex vs std::HashSet vs BTreeSet.
//!
//! Measures `contains(&key)` latency for hits and misses across set
//! sizes, plus the overhead of going through `HotSwap::load()` vs
//! holding a direct reference to the inner index.
//!
//! Run with `cargo bench -p hot-index`. Add `--features long-bench` for
//! the 10M-entry size (slow — minutes per group).

use std::collections::{BTreeSet, HashSet};

use criterion::{BenchmarkId, Criterion, black_box, criterion_group, criterion_main};
use hot_index::{FxHashIndex, HotIndex, HotSwap};
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

#[cfg(not(feature = "long-bench"))]
const SIZES: &[usize] = &[1_000, 100_000, 1_000_000];

#[cfg(feature = "long-bench")]
const SIZES: &[usize] = &[1_000, 100_000, 1_000_000, 10_000_000];

const PROBE_COUNT: usize = 1024;

fn random_strings(n: usize, seed: u64) -> Vec<String> {
    let mut rng = StdRng::seed_from_u64(seed);
    (0..n)
        .map(|_| {
            let len = rng.gen_range(6..=12);
            (0..len).map(|_| rng.gen_range(b'a'..=b'z') as char).collect()
        })
        .collect()
}

fn build_fx(items: &[String]) -> FxHashIndex<String, ()> {
    items.iter().map(|s| (s.clone(), ())).collect()
}

fn build_std(items: &[String]) -> HashSet<String> {
    items.iter().cloned().collect()
}

fn build_btree(items: &[String]) -> BTreeSet<String> {
    items.iter().cloned().collect()
}

/// Pick `count` deterministic indices spaced through `0..size`.
fn probe_indices(size: usize, count: usize) -> Vec<usize> {
    if size == 0 {
        return Vec::new();
    }
    let stride = (size / count).max(1);
    (0..count).map(|i| (i * stride + 7919 * i) % size).collect()
}

fn bench_lookup_hit(c: &mut Criterion) {
    let mut group = c.benchmark_group("lookup_hit");
    for &size in SIZES {
        let items = random_strings(size, 0xDEAD_BEEF);
        let fx = build_fx(&items);
        let std_set = build_std(&items);
        let btree = build_btree(&items);

        let probes: Vec<String> = probe_indices(size, PROBE_COUNT)
            .into_iter()
            .map(|i| items[i].clone())
            .collect();

        group.bench_with_input(BenchmarkId::new("FxHashIndex", size), &(), |b, _| {
            let mut iter = probes.iter().cycle();
            b.iter(|| {
                let k = iter.next().unwrap();
                black_box(fx.contains(k.as_str()))
            });
        });
        group.bench_with_input(BenchmarkId::new("std::HashSet", size), &(), |b, _| {
            let mut iter = probes.iter().cycle();
            b.iter(|| {
                let k = iter.next().unwrap();
                black_box(std_set.contains(k))
            });
        });
        group.bench_with_input(BenchmarkId::new("BTreeSet", size), &(), |b, _| {
            let mut iter = probes.iter().cycle();
            b.iter(|| {
                let k = iter.next().unwrap();
                black_box(btree.contains(k))
            });
        });
    }
    group.finish();
}

fn bench_lookup_miss(c: &mut Criterion) {
    let mut group = c.benchmark_group("lookup_miss");
    for &size in SIZES {
        let items = random_strings(size, 0xDEAD_BEEF);
        let fx = build_fx(&items);
        let std_set = build_std(&items);
        let btree = build_btree(&items);

        // Misses: a separate random pool, filtered to ensure no accidental hit.
        let in_set: HashSet<&String> = items.iter().collect();
        let misses: Vec<String> = random_strings(PROBE_COUNT * 4, 0xCAFE_F00D)
            .into_iter()
            .filter(|s| !in_set.contains(s))
            .take(PROBE_COUNT)
            .collect();
        assert!(
            !misses.is_empty(),
            "could not generate misses; collisions may be too dense"
        );

        group.bench_with_input(BenchmarkId::new("FxHashIndex", size), &(), |b, _| {
            let mut iter = misses.iter().cycle();
            b.iter(|| {
                let k = iter.next().unwrap();
                black_box(fx.contains(k.as_str()))
            });
        });
        group.bench_with_input(BenchmarkId::new("std::HashSet", size), &(), |b, _| {
            let mut iter = misses.iter().cycle();
            b.iter(|| {
                let k = iter.next().unwrap();
                black_box(std_set.contains(k))
            });
        });
        group.bench_with_input(BenchmarkId::new("BTreeSet", size), &(), |b, _| {
            let mut iter = misses.iter().cycle();
            b.iter(|| {
                let k = iter.next().unwrap();
                black_box(btree.contains(k))
            });
        });
    }
    group.finish();
}

fn bench_hot_swap_overhead(c: &mut Criterion) {
    // Run at the largest size only — the question is overhead, not scaling.
    let size = *SIZES.last().unwrap();
    let items = random_strings(size, 0xDEAD_BEEF);
    let fx = build_fx(&items);
    let probes: Vec<String> = probe_indices(size, PROBE_COUNT)
        .into_iter()
        .map(|i| items[i].clone())
        .collect();

    let swap = HotSwap::new(fx);
    // Direct reference to the inner index — bypasses the swap.load() call
    // entirely, baseline for the overhead measurement.
    let direct = swap.load_full();

    let mut group = c.benchmark_group("hot_swap_load_overhead");

    group.bench_function("direct_arc", |b| {
        let mut iter = probes.iter().cycle();
        b.iter(|| {
            let k = iter.next().unwrap();
            black_box(direct.contains(k.as_str()))
        });
    });

    group.bench_function("via_hotswap_load", |b| {
        let mut iter = probes.iter().cycle();
        b.iter(|| {
            let k = iter.next().unwrap();
            let g = swap.load();
            black_box(g.contains(k.as_str()))
        });
    });

    group.finish();
}

criterion_group!(benches, bench_lookup_hit, bench_lookup_miss, bench_hot_swap_overhead);
criterion_main!(benches);

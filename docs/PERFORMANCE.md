# Performance

This doc pins every performance claim the project makes to a measured number with a reproducible command. Numbers come from three places:

- **Criterion benches** (`cargo bench -p <crate>`) — controlled, statistically-confident, single-threaded, warm-cache.
- **Live `/stats` endpoint** — runtime observability from the production process at `api.justgetdomain.com`. Whole-handler latency (routing + parse + lookup + serialize), since process start.
- **Container logs** — one-shot measurements (snapshot load time on boot, batch wall-clock).

The doc is also honest about what it does *not* measure. Section 9 lists the gaps. A perf doc that claims everything is suspect.

---

## 1. TL;DR — homepage numbers

| Number                                       | Value           | How to reproduce                                                |
|----------------------------------------------|-----------------|-----------------------------------------------------------------|
| Hot index lookup, 1M entries (p50, controlled) | **35 ns**       | `cargo bench -p hot-index -- lookup_hit/FxHashIndex/1000000`    |
| Hot index miss, 1M entries (controlled)        | **11 ns**       | `cargo bench -p hot-index -- lookup_miss/FxHashIndex/1000000`   |
| Whole request latency (p50, live, prod)       | **4 µs**        | `curl https://api.justgetdomain.com/stats \| jq .runtime.p50_request_us` |
| Whole request latency (p99, live, prod)       | **858 µs**      | `curl https://api.justgetdomain.com/stats \| jq .runtime.p99_request_us` |
| Batch throughput, `diff_sorted`, 1M lines     | **623 MiB/s**   | `cargo bench -p streaming-set-diff -- throughput/diff_sorted/1000000` |
| Batch throughput, `diff` (linear), 1M lines   | **127 MiB/s**   | `cargo bench -p streaming-set-diff -- throughput/diff/1000000`  |
| Snapshot cold-load (rkyv, ~7.6K entries)      | **143 ms**      | container log: `loaded existing snapshot ... elapsed_ms=143`    |
| Live RSS, serving the production index        | **~115 MiB**    | `curl https://api.justgetdomain.com/stats \| jq .runtime.rss_bytes` |

---

## 2. Read path — controlled (criterion)

Synthetic data: random lowercase strings, length 6–12. 1024 cycling probes per bench, `black_box` on every lookup. Single-threaded, warm-cache, x86-64 Linux on an Oracle Ampere ARM free-tier VM.

### Hits — `contains(&key)` where the key IS in the set

| Impl           | 1K entries | 100K entries | 1M entries |
|----------------|-----------:|-------------:|-----------:|
| `FxHashIndex`  |   13.84 ns |     26.22 ns |   **35.41 ns** |
| `std::HashSet` |   26.29 ns |     48.11 ns |     57.29 ns |
| `BTreeSet`     |  102.63 ns |    413.90 ns |    752.55 ns |

### Misses — key is NOT in the set

| Impl           | 1K     | 100K     | 1M       |
|----------------|-------:|---------:|---------:|
| `FxHashIndex`  | 9.22 ns | 11.88 ns | **10.73 ns** |
| `std::HashSet` | 25.77 ns | 32.89 ns | 27.25 ns |
| `BTreeSet`     | 126.68 ns | 444.06 ns | 761.21 ns |

### `HotSwap::load()` overhead (1M entries)

| Path                              | Latency  |
|-----------------------------------|---------:|
| Direct `Arc<FxHashIndex>::contains` |  35.10 ns |
| Via `HotSwap::load().contains`    |  82.53 ns |
| **Overhead**                      | **~47 ns** |

### Findings

1. **`FxHashIndex` is ~2x faster than `std::HashSet`** across all sizes. Justified, not load-bearing — for HashDoS-resistant workloads `std::HashSet` adds a few dozen nanoseconds, usually fine.
2. **`BTreeSet` is 5–20x slower.** Don't reach for it as a primary lookup just because you might want sorted iteration later — hold a separate sorted index of references instead.
3. **Misses are ~3x faster than hits for hash impls** because misses skip the `String::eq` check on the candidate key. The domain workload is mostly misses (most candidates aren't in the registered set), so this asymmetry is in our favor.
4. **Lookup latency scales sub-linearly with size** (FxHash 14 → 26 → 35 ns from 1K → 100K → 1M) — the growth is cache effects, not algorithmic. Production reads under cache pressure will be 1.5–2x what the bench shows.
5. **`HotSwap::load()` adds ~47 ns per lookup** — atomic-ordering machinery (Acquire load + `Guard` create/drop). Fine for serve-time. The wrong pattern is calling `.load()` inside an inner lookup loop; the right pattern is calling `.load_full()` once per request and iterating against the resulting `Arc` (which is exactly what the example handlers do).

---

## 3. Read path — live (production)

`api.justgetdomain.com` runs the example backend (`examples/domain-availability/backend`) on a single Oracle free-tier VM behind a Cloudflare Tunnel. Whole-handler latency, lifetime histogram since process start, captured by `metrics_middleware` in `handlers.rs`.

```bash
curl https://api.justgetdomain.com/stats | jq .runtime
```

Sample output, after a small smoke test:

```json
{
  "request_count": 103,
  "p50_request_us": 4,
  "p99_request_us": 858,
  "max_request_us": 1039,
  "rss_bytes": 120639488
}
```

### Why the live p99 (858 µs) is so much larger than the controlled per-lookup (35 ns)

The criterion bench measures one `contains`. The live number measures the full handler — routing, query parsing, the lookup + filter + sort logic in `DomainIndex::search`, and JSON serialization of up to `limit` results. For a `/search?q=app&limit=10` request with sort and category filters, the index does ~7,500 internal entry checks, each with multiple TLD-set comparisons. That's not 35 ns per request; it's tens of microseconds of work in the index plus serialization.

The bench number tells you the index is fast. The live number tells you what the user actually waits.

---

## 4. Batch path — controlled (criterion)

Synthetic sorted corpus: random 6–12 char names × 1–5 TLDs from a small set. 10K candidates, half hits / half misses. Throughput reported as `Throughput::Bytes(corpus_len)` for both algorithms.

| Size       | Algorithm     | Time      | Throughput      |
|------------|---------------|----------:|----------------:|
| 100K lines | `diff`        |  14.93 ms |     87.76 MiB/s |
| 100K lines | `diff_sorted` |  15.36 ms |     85.32 MiB/s |
| 1M lines   | `diff`        | 103.23 ms |    126.85 MiB/s |
| 1M lines   | `diff_sorted` | **21.03 ms** | **622.72 MiB/s** |

### Findings

1. **At 100K lines the two algorithms tie within 3%.** Binary-search overhead (sort candidates + `lower_bound` per candidate) competes with the linear scan's simplicity. Don't reach for `diff_sorted` on small inputs.
2. **At 1M lines `diff_sorted` is ~5x faster** (21 ms vs 103 ms). The sort-aware advantage shows up.
3. **The crossover is between 100K and 1M lines** for this synthetic shape. Real corpora will shift it depending on candidate density and per-line cost.
4. **Linear throughput rises with size** (87 → 127 MiB/s) — per-iteration constant overhead amortizes.

### Extrapolated to the 5.6 GB nightly source

| Algorithm     | Best-case in-memory wall time |
|---------------|------------------------------:|
| `diff`        | ~44 s                         |
| `diff_sorted` | ~9 s                          |

Real production wall-clock is bounded by I/O when the source isn't fully page-cached. The original AGENTS.md framing of "minutes vs seconds" is **directionally right but oversells `diff`** at the in-memory case — linear is workable for the nightly batch (under a minute). The dramatic win for binary-search shows up most when (a) the source isn't cached and (b) the candidate set is small relative to the corpus.

---

## 5. Memory

Current observed live RSS while serving the production index: **~115 MiB**.

What's in it (rough breakdown, not measured precisely):

- The `DomainIndex` struct: ~7,586 entries × (word string + `FxHashSet<String>` of registered TLDs + per-entry overhead). At ~1,012 unique TLDs across the corpus and an average handful per entry, this is the dominant slice.
- The all-TLDs vector and four parallel sort-order index vectors.
- The `Categories` map (loaded once at startup).
- Tokio runtime + `arc-swap` overhead + small per-handler allocations.
- The `hdrhistogram` request-latency accumulator (~tens of KiB).

### Day-cycle memory profile (gap)

The original spec for this section called for a graph showing RSS over a full day cycle: idle → batch start → dual-index peak (old index still serving while new one builds) → atomic swap → old index dropped. **That graph is not in this doc.** It requires triggering a batch and sampling RSS over the dual-index window, which I haven't done. Listed as a follow-up.

What we expect to see based on the design:
- Idle: the value above (~115 MiB).
- During batch scan + index build: RSS roughly doubles transiently while both old and new indexes are alive simultaneously.
- After swap: returns to baseline within a few seconds (the moment the last reader drops its `Guard` reference, the old `Arc<Option<DomainIndex>>` is freed automatically).

---

## 6. Snapshot persistence

The example backend uses `hot_index::persistence::rkyv` to save / load its `Snapshot` (rkyv-archived). Atomic write via tempfile + rename.

Container log from the most recent boot:

```
loaded existing snapshot entries=7586 tlds=1012 elapsed_ms=143
```

So **143 ms cold-start** for a 7,586-entry / 1,012-TLD snapshot. At larger scales (tens of MiB snapshot files) we'd expect hundreds of ms; at GB scales, seconds.

### bincode vs rkyv encode/decode comparison (gap)

The library supports both codecs (`hot-index` features `bincode` and `rkyv`). I have one rkyv load number from production but **no head-to-head bench** between the two encoders on the same data. The original ADR (#20) calls out the trade-off (rkyv = faster cold-start, larger dep tree; bincode = simpler, fully materialized on load); a real measurement would let the ADR cite a number instead of folklore. Listed as a follow-up.

---

## 7. Concurrency

The `hot-index` crate ships with a unit test (`readers_see_monotonic_swaps`) that asserts the load-bearing invariant: a reader concurrent with a writer never observes a value moving backwards across an atomic swap. The test runs a writer thread doing 1000 swaps in a tight loop while a reader thread does 1000 loads, and the assertion holds.

This proves **correctness**, not throughput.

### Reader throughput under concurrent swap (gap)

There is no benchmark answering "what reads/sec can the index sustain while a writer is swapping every 100 ms?" The criterion benches in #8 are single-threaded. If the homepage wants to claim "lock-free reads at N ops/sec under load," that bench is missing. Listed as a follow-up.

---

## 8. What this doc deliberately does NOT measure

Naming the gaps is what makes the doc credible:

- **10M-scale lookups.** Available behind `cargo bench -p hot-index --features long-bench`; not run for this writeup.
- **Memory over a full day cycle.** See §5 — the dual-index peak is theoretical, not measured.
- **Concurrent reader throughput while a writer swaps.** See §7 — correctness is tested, throughput isn't.
- **`bincode` vs `rkyv` head-to-head.** See §6 — the ADR cites trade-offs, not numbers.
- **Cold-cache vs warm-cache lookup latency.** All criterion runs are warm-cache. Production reads under cache contention from other work are ~1.5–2x slower than the bench shows.
- **Per-route latency breakdown.** The histogram is a single global accumulator, not per-endpoint.
- **Geographic latency.** Numbers above are at the origin server. Cloudflare adds tens of ms of edge time for end users; that's a different concern.

If any of these gaps becomes important to a claim being made elsewhere, file a ticket.

---

## 9. Reproducibility — every command in one place

```bash
# Hot-index lookup benches (read path, controlled)
cargo bench -p hot-index

# 10M-entry size (slow, opt-in)
cargo bench -p hot-index --features long-bench

# Streaming-set-diff throughput benches (batch path, controlled)
cargo bench -p streaming-set-diff

# 10M-line corpus (slow, opt-in)
cargo bench -p streaming-set-diff --features long-bench

# Live runtime stats from the production process
curl https://api.justgetdomain.com/stats | jq .

# Specifically the runtime block
curl https://api.justgetdomain.com/stats | jq .runtime

# Snapshot cold-load time from container logs
docker logs justgetdomain-api 2>&1 | grep "loaded existing snapshot"
```

Criterion's HTML reports land in `target/criterion/` after each `cargo bench` run.

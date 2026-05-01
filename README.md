# hot-memory-diff-engine

A Rust workspace for building hot-swappable in-memory indexes from huge sorted sources on disk. Microsecond reads, atomic publish-once-per-batch, no database, single-process. Currently powers [justgetdomain.com](https://justgetdomain.com), one example of N.

## The problem

You have a small candidate set that fits in RAM and a large sorted source on disk (gigabytes). You want, for each candidate, what the source says about it — and you want it served at microsecond latency from a single Rust binary, rebuilt nightly, with no downtime during the swap.

This workspace is the two primitives that make that possible, plus the example consumers that prove they're real.

## Two crates

### [`crates/hot-index`](crates/hot-index/)

The serving side. A `HotIndex<K, V>` trait, an `FxHashIndex<K, V>` default impl backed by `rustc-hash`, and a `HotSwap<T>` wrapper around `arc-swap` that lets one writer atomically replace the live value while readers keep reading without ever blocking. Optional persistence behind two interchangeable codec features:

- `bincode` — for any `serde`-shaped `T`. Smaller dep tree.
- `rkyv` — for any `Archive`-shaped `T`. Faster cold-start through framed layout.

### [`crates/streaming-set-diff`](crates/streaming-set-diff/)

The building side. A `LineParser` trait you implement once for your file format, plus two algorithms with the same input/output contract:

- `diff` — naive linear scan. O(n + k). Reads every line.
- `diff_sorted` — sort-aware binary search per candidate. O(k · log n + matches). For a 5.6 GB sorted source with 10K candidates, this is the difference between minutes and seconds.

A parity test asserts the two algorithms produce byte-identical output on any well-formed sorted input.

## Examples

### [`examples/domain-availability`](examples/domain-availability/)

Full integration. Rust backend + Next.js frontend. Serves `api.justgetdomain.com` in production. Uses both crates: `hot-index` (with `rkyv` persistence) holds the live index; `streaming-set-diff` builds it nightly from a sorted registered-domains file.

### [`examples/breach-password-check`](examples/breach-password-check/)

CLI that takes a sorted [HIBP-style](https://haveibeenpwned.com/Passwords) `HASH:COUNT` corpus and a list of candidate password hashes, reports which appear in breaches and how many times. Uses `streaming-set-diff` only (no live serve). Different file format, different value type — proves the abstraction is real, not domain-search code with `pub` slapped on it.

## Headline numbers

All numbers reproducible. Full table + commands in [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

| What                                                  | Value         | Source                                  |
|-------------------------------------------------------|---------------|-----------------------------------------|
| `FxHashIndex` lookup, 1M entries (controlled, p50)    | **35 ns**     | `cargo bench -p hot-index`              |
| `FxHashIndex` miss, 1M entries (controlled)           | **11 ns**     | `cargo bench -p hot-index`              |
| `diff_sorted` throughput, 1M lines                    | **623 MiB/s** | `cargo bench -p streaming-set-diff`     |
| `diff` (linear) throughput, 1M lines                  | **127 MiB/s** | `cargo bench -p streaming-set-diff`     |
| Whole request latency (live, prod, p99)               | **858 µs**    | `curl https://api.justgetdomain.com/stats` |
| Live RSS serving the production index                 | **~115 MiB**  | same                                    |
| `HotSwap::load()` overhead per lookup                 | **~47 ns**    | `cargo bench -p hot-index`              |

## Limits

This is a discovery engine for the gaps in the registered-domain set, not a recommender. It does not filter trademarks. It will return `apple.xyz` if it's unregistered. **You should not register it.** See [`docs/LIMITS.md`](docs/LIMITS.md) for what this engine deliberately does not do, and why that's a deliberate scope choice rather than unfinished work.

## Decisions

Why is the index hash-based and not a trie? Why bincode *and* rkyv as feature flags instead of one or the other? Why no `/check/{name}` endpoint? Why a single binary instead of separate batch and serve services? See [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Layout

```
crates/                 the two libraries
  hot-index/
  streaming-set-diff/
examples/               the consumers
  domain-availability/  live integration (api.justgetdomain.com)
  breach-password-check/  CLI demonstrating streaming-set-diff
docs/
  PERFORMANCE.md        measured numbers + reproducible commands
  DECISIONS.md          ADR-style rationale per non-obvious choice
  LIMITS.md             deliberately-out-of-scope work
docker-compose.yml      local dev for the example backend + frontend
```

For engineer-onboarding details (build / test / run, the two invariants the code maintains, conventions) see [`AGENTS.md`](AGENTS.md).

## License

MIT OR Apache-2.0 (per crate).

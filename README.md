# JustGetDomain an usecase of hot-memory-diff-engine

The problem was I need to find set of available domains after taking difference from a set of 5.6gb 314 millions of lines of corpus. To tackle that problem I built a reusable library to solve a class of problem most teams reach for a database to solve, then pay for it with latency, operational surface, and a deployment cost.

[justgetdomain.com](https://justgetdomain.com) is the live demo of this pattern where I was able to serve the large results in subseconds.

---

## The class of problem

A lot of products are shaped like this without anyone calling it out:

- A **small, bounded universe** of things you care about (your candidates, your watchlist, your catalog)  kilobytes to a few hundred megabytes.
- A **much larger reference source** that's authoritative but slow-moving gigabytes on disk, regenerated on a schedule (nightly, hourly, weekly).
- A read pattern that's **point lookups and filters over the small universe**, not analytics over the large one.
- A latency target measured in **microseconds**, because the lookup happens behind every user interaction.

Examples that fit the shape:

- "Which of my 10K candidate domains are unregistered, across every TLD?"  the live demo.
- "Which of my users' password hashes appear in this 800M-entry HIBP corpus?"  `examples/breach-password-check`.
- Which SKUs in our catalog are flagged in this morning's supplier feed?
- Which feature flags are enabled for this account, given a config file rebuilt on every deploy?
- Which IPs in the request stream match today's threat-intel dump?
- Which of our 50K monitored repos had a CVE published against them overnight?

The instinct is: stand up Postgres, ETL the big file in nightly, index the columns we filter on, query it from the API. That works. It also costs an order of magnitude more latency than the work actually requires, plus a database to operate, plus a network hop, plus an ORM, plus migrations.

The observation behind this repo is that the work is **a set difference between two things you already have in memory** (the small candidate set) **and a thing you can stream past once** (the large source). You don't need a query planner. You need a hash table and an atomic pointer swap.

---

## What this repo gives you

Two small libraries that compose into the pattern, and two example consumers that prove the libraries aren't single-purpose.

### The building side  `crates/streaming-set-diff`

Stream the large source past once, ask a parser-of-your-choice for a cheap key per line, look it up in the candidate set, collect values on hits. O(n + k) for the linear pass. O(k · log n + matches) for the sort-aware variant on a sorted source  for a 5.6 GB file with 10K candidates that's the difference between minutes and seconds.

You implement a `LineParser` once per file format. Everything else is generic. The same crate handles a domain dump and a HIBP password corpus without knowing about either.

### The serving side  `crates/hot-index`

Take the result, wrap it in `HotSwap<T>`, serve from it. Reads are one atomic load and a hash lookup  sub-50 ns of overhead on top of whatever your `T` charges for the actual work. When the next batch finishes, one writer publishes the new value with an atomic pointer swap; readers in flight keep their old snapshot until they finish, then it's freed. There are no locks on the read path. There is no rebuild step on the read path. There is no read-modify-write surface to misuse, because the API doesn't expose one.

Persistence is two interchangeable Cargo features (`bincode` for `serde`, `rkyv` for zero-copy framed layout). On restart, load the last snapshot off disk and resume serving in the time it takes to mmap a file. The source of truth is the upstream batch input  this is crash-recovery, not a database.

### The consumers  `examples/`

`domain-availability` is the live integration: Axum + Tokio backend serving `api.justgetdomain.com`, Next.js frontend at `justgetdomain.com`. Uses both crates. `breach-password-check` is a CLI that uses only `streaming-set-diff`, against a different file format and a different value type. Both exist so the abstractions can't quietly become "domain-search code with `pub` slapped on it."

---

## Why Rust

Rust is a tool, not the point. It earned its place here for three specific reasons, in this order:

1. **Predictable latency without a GC.** The latency budget is microseconds. A managed runtime can stay under that on average, but the tail is the part you can't hide from. With Rust the tail is a function of what you wrote, not what the runtime decided to do this minute. That alone is the case for most of the read path.

2. **Zero-cost abstractions where they actually matter.** `HotIndex<K, V>` is a trait. `LineParser` is a trait. They compile down to direct calls. The same code that's clean enough to read is the code that runs  there's no "production build" with the abstraction stripped out, because the abstraction was never paying for itself at runtime in the first place.

3. **A type system that enforces the invariant.** The whole architecture rests on "the live snapshot is never mutated; it's replaced." Rust's ownership model lets `HotSwap<T>` expose `load()` and `swap()` and nothing else. There is no `get_mut` to forget about. The discipline isn't a code-review rule; it's a compile error.

The same pattern would translate to C++ (more footguns, same ceiling), Go (GC pauses you'd need to engineer around), Java (likewise, with more tuning surface), or Zig (younger ecosystem, fewer libraries to lean on). I'd reach for Rust again because the combination of "no GC" + "ownership-enforced invariants" + "the library ecosystem actually exists" is rare. But the *architecture*  small candidate set in RAM, stream the large source, atomic publish, lock-free reads  generalizes to any language. The library boundaries (`HotIndex` trait, `LineParser` trait, `HotSwap` wrapper) are the contribution. Rust is the implementation choice that made them cheap to enforce.

---

## Where this fits, and where it doesn't

It fits when:

- The "things you care about" universe is bounded and fits comfortably in process RAM (megabytes to ~10 GB on a generously-sized VM).
- The reference source rebuilds on a cadence you can run as a batch (minutes-to-hours), not a continuous stream.
- Reads dominate writes by orders of magnitude.
- A few seconds of staleness after a batch is acceptable. (It's atomic  there's never a partial view  but the snapshot is from the last batch, not from "now.")

It does not fit when:

- The source of truth is a continuous stream and freshness is measured in milliseconds. (Use a real streaming system.)
- Writes are interleaved with reads from many actors. (Use a database.)
- The candidate universe doesn't fit in RAM and you can't shard it. (Use an indexed store.)
- You need ad-hoc analytics over the large source itself. (That's a warehouse problem, not this.)

This is a load-bearing design choice, not a TODO. See [`docs/LIMITS.md`](docs/LIMITS.md) for the full scope-boundary write-up.

---

## Headline numbers

All reproducible. Full table + commands in [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

| What                                                  | Value         | Source                                  |
|-------------------------------------------------------|---------------|-----------------------------------------|
| `FxHashIndex` lookup, 1M entries (controlled, p50)    | **35 ns**     | `cargo bench -p hot-index`              |
| `FxHashIndex` miss, 1M entries (controlled)           | **11 ns**     | `cargo bench -p hot-index`              |
| `HotSwap::load()` overhead per lookup                 | **~47 ns**    | `cargo bench -p hot-index`              |
| `diff_sorted` throughput, 1M lines                    | **623 MiB/s** | `cargo bench -p streaming-set-diff`     |
| `diff` (linear) throughput, 1M lines                  | **127 MiB/s** | `cargo bench -p streaming-set-diff`     |
| Whole request latency (live, prod, p99)               | **858 µs**    | `curl https://api.justgetdomain.com/stats` |
| Live RSS serving the production index                 | **~115 MiB**  | same                                    |

The interesting number is the last one. The whole production system  index, HTTP server, metrics, SSE  runs in ~115 MiB on a free-tier Oracle VM. That's the operational case for this design: a database-shaped problem solved without a database, fitting in the memory headroom most APIs leave on the table.

---

## Layout

```
crates/                   the two libraries (the contribution)
  hot-index/
  streaming-set-diff/
examples/                 consumers proving the libraries aren't single-purpose
  domain-availability/    live integration (api.justgetdomain.com)
  breach-password-check/  CLI using only streaming-set-diff
docs/
  ARCHITECTURE.md         engineering view of the workspace
  PERFORMANCE.md          measured numbers + reproducible commands
  DECISIONS.md            ADR-style rationale per non-obvious choice
  LIMITS.md               deliberately-out-of-scope work
docker-compose.yml        local dev for the example backend + frontend
```

For engineer-onboarding (build / test / run, the two load-bearing invariants, conventions) see [`AGENTS.md`](AGENTS.md). For the deeper architectural rationale see [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## License

MIT OR Apache-2.0 (per crate).

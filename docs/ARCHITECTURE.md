# Architecture

This is the engineering view of the `hot-memory-diff-engine` workspace. For product framing see `README.md`. For measured numbers see `PERFORMANCE.md`. For the why behind individual choices see `DECISIONS.md`. For deliberately-out-of-scope work see `LIMITS.md`.

---

## Workspace shape

```
crates/
  hot-index/                 serving side: HotIndex trait + FxHashIndex + HotSwap + persistence
  streaming-set-diff/        building side: LineParser trait + diff (linear) + diff_sorted (binary search)
examples/
  domain-availability/       live integration — Axum/Tokio backend + Next.js frontend (api.justgetdomain.com)
  breach-password-check/     CLI — uses streaming-set-diff only, no live serve
docker-compose.yml           local dev for the backend + frontend
```

The two crates are the architecture. Everything in `examples/` is a consumer that proves the abstractions are real.

---

## The two load-bearing invariants

These are non-negotiable. Break either and the architecture stops working.

### 1. The read path never blocks on a writer.

Reads go through `HotSwap::load()` — one `Acquire` atomic load + a `Guard` that holds a refcount on the current snapshot. Writers replace the snapshot via `HotSwap::swap(new)`: an atomic pointer publish that never blocks readers. The previous snapshot stays alive until the last outstanding `Guard` drops, then is freed.

`HotSwap` wraps `arc_swap::ArcSwap`. The wrapper exists so the build-once-publish-once lifecycle is the only API — there's no read-modify-write surface to misuse.

### 2. The build path never mutates the live snapshot.

Each batch builds an entirely new value `T` (a `DomainIndex` for the live demo, anything else for other consumers) in scratch memory, then publishes it. No per-key updates. No in-place mutation. No read-write locks. This is what makes invariant #1 free: the live value is read-only by construction.

The unit test `hot_index::tests::readers_see_monotonic_swaps` asserts both — a writer thread doing 1000 swaps in a tight loop concurrent with a reader doing 1000 loads, asserting reads never observe a backwards-moving value.

---

## Crate: `hot-index`

The serving side.

- `HotIndex<K, V>` — minimal read-surface trait (`get`, `contains`, `len`). Implementors are immutable snapshots.
- `FxHashIndex<K, V>` — default impl backed by `rustc-hash::FxHashMap`. Chosen for hash speed on short-string keys.
- `HotSwap<T>` — atomic-publish wrapper around `ArcSwap<T>`. The only way one writer hands a fresh `T` to many readers without locking either side.
- `persistence::bincode` and `persistence::rkyv` — two interchangeable codecs behind Cargo features:
  - `bincode` — for any `serde`-shaped `T`. Smaller dep tree. Full materialization on load.
  - `rkyv` — for any `Archive`-shaped `T`. Larger dep tree. Faster cold-start through framed layout.

Both codecs share one atomic-write surface (write-tmp → rename). The intended lifecycle is: build → `save` → process restart → `load` → `HotSwap::new` → resume serving. No WAL, no replication, no transactions — crash-recovery for a workload whose source of truth lives upstream in the nightly batch input.

---

## Crate: `streaming-set-diff`

The building side.

- `LineParser` — trait you implement once per file format. Hands the diff a cheap key view (`&str`) per line, then the full value only on a candidate hit. The cheap-then-full split keeps the per-line cost low for the dominant non-match case.
- `diff` — linear scan. O(n + k), where n is source lines and k is matched candidates. Reads every line.
- `diff_sorted` — sort-aware binary search per candidate. O(k · log n + matches). For a 5.6 GB sorted source with ~10K candidates, the difference is minutes vs seconds.
- A parity test asserts the two algorithms produce byte-identical output on any well-formed sorted input. This is what lets `diff_sorted` exist without forking the trait.

Outputs a `DiffResult<V>` containing per-candidate values from the source plus the unmatched-candidate set. The crate does no I/O other than reading the source — persistence and serving are someone else's job (i.e. `hot-index`).

---

## Example: `domain-availability` backend

Single Rust binary using both crates. Built on Axum + Tokio. Backend module layout (`examples/domain-availability/backend/src/`):

| Module | Role |
|---|---|
| `scanner` | Reads the sorted registered-domains source (or a synthetic dev source). Implements `LineParser`. |
| `batch_runner` | Drives `streaming-set-diff` over the scanner output, builds a fresh `DomainIndex`. |
| `dictionary` / `categories` | Loads the candidate set + curated category metadata. |
| `index` | `DomainIndex`: the per-batch immutable value held inside `HotSwap`. Carries entries, TLD lists, sort indices, search filters. |
| `snapshot` | rkyv-shaped serialization wrapper around the index for `hot_index::persistence::rkyv`. |
| `state` | `AppState`: `HotSwap<Option<DomainIndex>>` for the live index, plus batch status, request-latency histogram, shared categories. |
| `scheduler` | Owns the cadence (boot-time first build → persisted snapshot reload → recurring rebuilds). |
| `handlers` | Axum routes. Lock-free reads against `HotSwap`. Includes a metrics middleware that records every request's elapsed µs into the lifetime histogram. |
| `bin/domain_scan.rs` | One-shot CLI for ad-hoc scans without standing up the server. |

`AppState.index` is `HotSwap<Option<DomainIndex>>` — `Option` because the server starts before the first batch completes. Handlers `load()` and gracefully return "warming up" until a snapshot is published.

`AppState.batch` stays on raw `ArcSwap` (not `HotSwap`) because its update pattern is per-field mutation via a closure, not full-value swap. `HotSwap` is deliberately narrower than `ArcSwap` and won't accept a partial-update pattern; the two coexist intentionally.

---

## Example: `breach-password-check` CLI

Takes a sorted HIBP-style `HASH:COUNT` corpus and a list of candidate hashes. Reports which appear in breaches and how many times. Uses `streaming-set-diff` only — no `hot-index`, no server, no persistence. A different file format and a different value type, exercising the `LineParser` trait against a non-domain consumer. Exists to prove the abstraction is real, not domain-search code with `pub` slapped on it.

---

## Batch lifecycle (end-to-end, for the domain-availability demo)

1. **Source on disk.** Pre-sorted file containing all registered domains across all TLDs (~5.6 GB). Sorted by full domain string, so all TLDs for a given name sit on consecutive lines.
2. **Candidate set.** Dictionary + two-word combinations + exhaustive short strings, loaded into a `FxHashSet` at batch start. Megabytes — fits in RAM.
3. **Diff.** `diff_sorted` walks the candidate set against the source, asking the scanner's `LineParser` for keys/values. Output is a `DiffResult<V>`: per-candidate registered TLDs + the unmatched-candidate set.
4. **Index build.** `batch_runner` turns the `DiffResult` into a fresh `DomainIndex` — entries, sort orders, category indices, TLD bitsets.
5. **Persist.** `hot_index::persistence::rkyv::save` writes the snapshot atomically (tmp file → rename).
6. **Publish.** `HotSwap::swap` replaces the live `Option<DomainIndex>`. New requests pick up the fresh snapshot on their next `load()`. In-flight requests keep their `Guard` on the old snapshot until they complete.
7. **Drop.** When the last outstanding `Guard` from the previous snapshot is released, the old `Arc` refcount hits zero and the memory is freed.

No locks are held during any of this. No request is interrupted. The crossover window is the only moment two snapshots coexist in RAM.

### Cold start

On process boot: load the latest rkyv snapshot from disk → wrap in `HotSwap` → start serving. No need to re-run the full batch on every restart. Previous snapshot is retained on disk for rollback.

### Memory budget

Two full indexes coexist briefly during the swap. If the live index is ~115 MiB (current prod RSS), peak swap-window usage is ~230 MiB — comfortably within the 24 GB Oracle VM budget.

---

## Serving

Lock-free reads. The middleware path is:

```
Axum router → metrics_middleware → handler → HotSwap::load() → DomainIndex query → SSE/JSON response
```

Per-request work is microseconds: one atomic load, one `Guard` clone, hash/index lookups, response serialization. The metrics middleware records elapsed µs into a process-lifetime `hdrhistogram`, exposed via a stats endpoint — this is where the "p99 858 µs" number on the README comes from.

### Connection hygiene (SSE)

SSE connections persist. Cloudflare can't catch a malicious client that opens many legitimate-looking connections and holds them. The Rust server enforces:

- Max concurrent connections per IP.
- SSE inactivity timeout.
- Max results per stream — client paginates for more.

These bound file descriptors, memory, and connection duration per client. Resource hygiene, not rate limiting.

---

## Persistence model

The rkyv snapshot file is a point-in-time dump of the in-memory index — not a database, more like a Redis RDB. Purpose is crash-recovery only. The source of truth is the upstream sorted file regenerated nightly by the data provider; if a snapshot is corrupt, the next batch produces a fresh one.

Two snapshots are kept on disk: current + previous. Rollback = restart pointing at the previous file. Yesterday's data being stale by 24 h is acceptable for a daily-refresh product.

---

## Infrastructure

### Oracle Free Tier VM (24 GB RAM, 4 Ampere cores)

Runs:
- The Rust binary (batch + HTTP server, single process).
- `cloudflared` tunnel daemon.

Two processes total.

### Cloudflare (free plan)

- **Pages** — static Next.js frontend at `justgetdomain.com`, deployed via git push.
- **Tunnel** — outbound-only connection from the VM to Cloudflare. No inbound ports open on the VM.
- **DNS** — `justgetdomain.com` → Pages, `api.justgetdomain.com` → Tunnel.

### Network topology

```
Browser
  ├── justgetdomain.com         → Cloudflare Pages (static frontend)
  └── api.justgetdomain.com     → Cloudflare Edge
                                       │ (outbound-only Cloudflare Tunnel)
                                  Rust HTTP server (localhost, no public port)
```

### Security layers

- **Network DDoS** — absorbed at the Cloudflare edge.
- **Server access** — zero open inbound ports. Reaching the VM requires compromising Cloudflare's internal network.
- **Application abuse** — handled by the Rust server's connection hygiene.

### Deployment

- Docker container for the Rust binary.
- Sidecar for `cloudflared`.
- `docker compose up -d --build api` is the canonical post-change deploy step (see `AGENTS.md`).
- Terraform for VM + networking provisioning is on the roadmap, not yet wired up.

---

## What this architecture deliberately omits

| Piece | Why omitted |
|---|---|
| Postgres | Access pattern is index-shaped, not table-shaped. Snapshot file handles persistence. |
| Redis | The full available set fits in process RAM; an external cache is pure overhead. |
| Kafka | One producer, one consumer, no replay needs. |
| Temporal | Batch is generate-filter-publish; no multi-day orchestration. |
| Nginx | Cloudflare Tunnel is the reverse proxy. |
| Kubernetes | One binary, one VM. Docker compose is sufficient. |
| Multi-service split | Batch and serve already share an address space cheaply; splitting them buys deployment complexity for no current win. The `HotSwap` boundary means a future split is mechanical, not architectural. |
| Rate limiting | Cloudflare handles DDoS, connection hygiene handles per-IP abuse. Add when traffic justifies it. |

See `LIMITS.md` for the broader list of intentionally-out-of-scope features (trademark filtering, fuzzy intent, etc.).

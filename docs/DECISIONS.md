# Decisions

Short ADR-style entries for non-obvious choices. Each one names the alternative considered and why it lost. Numbers come from `docs/PERFORMANCE.md`.

---

## 1. Single binary for batch + serve

**Decision.** One Rust process, one Tokio runtime, one container. Batch download / scan / persist runs in the same binary that serves HTTP queries.

**Alternative considered.** Two services — a batch worker (cron-triggered, runs to completion, produces snapshot file) and a serving process (loads snapshot, serves HTTP). Separate containers, separate deploy, separate scaling.

**Why the single binary won.** The two workloads have orthogonal resource profiles: batch is I/O-bound on sequential file reads, serve is CPU-bound on microsecond hash lookups. They never compete for the same resource at the same time. Splitting them would add a service boundary, a snapshot-file-watcher pattern, a deploy surface, and a config surface — all to solve a contention problem that doesn't exist on a free-tier 4-core VM. The atomic in-process swap (`HotSwap`) replaces what would otherwise need to be a file-watch IPC layer.

---

## 2. `FxHashSet` over `std::HashSet`

**Decision.** Default `HotIndex` impl backed by `rustc-hash`'s `FxHashMap`.

**Alternative considered.** `std::HashSet` with the default SipHash13 hasher.

**Why FxHash won.** Measured 2x faster on the lookup hot path: 35 ns vs 57 ns at 1M entries (see PERFORMANCE.md §2). Justified, not load-bearing — the absolute cost of `std::HashSet` is tens of nanoseconds, fine for most workloads. We give up HashDoS resistance, which is acceptable here because the candidate set comes from a trusted batch input, not from network requests.

If a future caller's keys come from untrusted input, swap in a different `HotIndex` impl behind the same trait — the surface is designed for it.

---

## 3. `bincode` and `rkyv` both as Cargo features (not "pick one")

**Decision.** `hot-index/persistence` ships two codec modules — `bincode` and `rkyv` — behind independent feature flags. Callers pick at the call site.

**Alternative considered.** Standardize on one codec. Originally bincode (simpler, smaller deps); later rkyv (faster cold-start through framed layout).

**Why both won.** The two encoders impose incompatible trait bounds on `T` (`Serialize + DeserializeOwned` vs `Archive + …`). Forcing one cuts off real consumers — bincode-only loses the cold-start performance the example backend depends on; rkyv-only forces every consumer to derive `Archive` even when serde is enough. The pluggable design lets each example pick what fits, with one shared `atomic_write` helper underneath. The example backend uses rkyv (preserves the existing 143 ms snapshot load); other consumers can use bincode without touching rkyv.

---

## 4. No `/check/{name}` endpoint

**Decision.** The HTTP API exposes `/search`, `/stream`, `/tlds`, `/tlds-for`, `/stats`, `/health`, `/ready` — no per-name lookup endpoint.

**Alternative considered.** A REST endpoint that takes a single name and returns its availability status across all TLDs.

**Why we don't have one.** A single-name lookup recreates the GoDaddy / Namecheap UX this product was built to replace. The whole point is that the user **doesn't have a name yet** — they're browsing the available set. Adding a per-name endpoint signals that we think the user already knows what they want and just needs a yes/no, which contradicts the discovery framing. If someone wants a per-name lookup they can `curl /search?q=apple` and read the first result.

---

## 5. Double-buffer atomic swap (not RCU, not copy-on-write per key)

**Decision.** Index updates happen via `HotSwap::swap(new_index)` — build the new index in full, atomically publish via `arc-swap`, drop the old one when the last reader's `Guard` goes out of scope.

**Alternative considered.** RCU-style per-key updates (mutate individual entries while readers traverse), or copy-on-write semantics (clone on write through a `parking_lot::RwLock`).

**Why double-buffer won.** The workload rebuilds the entire index nightly from a single sorted source. There are no per-key writes — the smallest unit of update is the whole snapshot. Per-key RCU would add complexity for a write pattern we don't have. CoW with a lock would block readers for the duration of the rebuild (minutes during a batch). Atomic swap costs one `Acquire` load per read (~47 ns measured, see PERFORMANCE.md §2) and never blocks. The unit test `readers_see_monotonic_swaps` asserts the invariant.

---

## 6. Cloudflare Tunnel, not a public inbound port

**Decision.** The serving process listens on `localhost:8001`. `cloudflared` runs alongside it, opens an outbound tunnel to Cloudflare's edge, and exposes the service at `api.justgetdomain.com`.

**Alternative considered.** Open port 8001 (or 443) on the Oracle VM, point DNS at the public IP, terminate TLS at the origin.

**Why the tunnel won.** Zero open inbound ports on the VM. Cloudflare absorbs DDoS, manages TLS, provides edge caching for free. The VM has no firewall rules to maintain, no Let's Encrypt renewal cron, no IP-based attack surface. The trade-off is one extra process (`cloudflared`) and a vendor dependency on Cloudflare's free tier.

---

## 7. Snapshot persistence folded into `hot-index`, not a standalone `snapshot-rdb` crate

**Decision.** `hot-index/persistence` ships save/load functions behind feature flags. There is no separate `snapshot-rdb` crate.

**Alternative considered.** Three crates — `hot-index`, `streaming-set-diff`, and a standalone `snapshot-rdb` for atomic write + serde wrappers. Originally listed as #4 on the project board.

**Why folding in won.** A standalone `snapshot-rdb` would have been ~50 LOC of `serde` + `bincode` + `tempfile` + `rename`. As a "library" it earns no portfolio slot — every Rust serde tutorial covers atomic write. Real callers always combine it with `hot-index` (the index is what gets persisted). Folding it in keeps the workspace at two crates (cleaner profile scan), gives `hot-index` callers persistence as a feature flag (one less dep tree to manage), and avoids forcing a tiny crate into existence just because the original ticket said so.

---

## 8. Two algorithms in `streaming-set-diff` (`diff` + `diff_sorted`), not just one

**Decision.** The crate ships both a naive linear scan (`diff`) and a sort-aware binary-search variant (`diff_sorted`), with a parity test asserting they produce byte-identical output.

**Alternative considered.** Ship only the binary-search variant (faster for large inputs).

**Why both won.** Measured at 100K lines, the two algorithms are within 3% of each other (PERFORMANCE.md §4). Binary-search overhead (sort candidates, lower-bound per cand) competes with the linear scan's simplicity at small scale. The crossover is somewhere between 100K and 1M lines for our synthetic shape; it shifts with candidate density and per-line cost. Forcing every caller through `diff_sorted` would make the crate slower for small inputs and would require all sources to be sorted (which not every caller's data is). Two functions, same surface, callers pick.

The criterion bench in #9 also gets to A/B them on the same input — a small but real artifact value.

# JustGetDomain.com — Architecture Document

## Product Positioning

The domain search experience is broken. Users think of a name, type it, find it taken, repeat. GoDaddy's AI suggests long forgettable names like `notesyncpro.com`. Nobody shows you what's actually available.

JustGetDomain inverts the process. Pre-scan every short domain combination, filter out taken names, present only what's registrable. Users browse availability instead of guessing. The product is the exhaustive truth about short domain availability, refreshed daily.

**Core edge:** Short, real-word-rooted domains that feel like brands. Not generated slop. Not 14-character suggestions. Names like `jotly.com` or `scrib.co` that nobody else surfaces.

We are not a registrar. We do not sell domains. We make the frustrating part of domain search disappear.

---

## Candidate Tiers

Results are organized by value, highest first:

**Tier 1 — Single real words**
Raw dictionary words available on any TLD. `desk`, `bloom`, `crisp`, `plume`. Rarest and most valuable. Estimated ~10-20K candidates.

**Tier 2 — Two-word compounds**
Two short words combined into 6-8 characters. `inkdrop`, `sunpath`, `mintpad`. This is the primary product surface. Estimated ~5-10M candidates depending on length cap.

**Tier 3 — Exhaustive short strings**
Every possible 3, 4, 5-letter combination regardless of meaning. `bxq`, `zmkr`, `prfl`. No dictionary required — pure enumeration. No competitor surfaces this. 3-letter: 17,576 candidates. 4-letter: 456,976. 5-letter: 11.8M.

**Tier 4 — (Future) Word + common affix**
`notely`, `scribr`, `jotful`, `padify`. Startup-flavored derived words. Out of scope for v1.

**Tier 5 — (Future) Romanized foreign words**
Real word roots from other languages that English speakers find intuitive. `brevio`, `claro`. Out of scope for v1.

---

## Data Source

A single pre-sorted 5.6GB text file containing all registered domains across all TLDs. Format:

```
zzzzzzzzzzz.xyz.    3600    in    ns    expirens4.hichina.com.
```

Key properties:
- Sorted alphabetically by full domain string
- All TLDs for a given name appear on consecutive lines
- Updated daily by data provider (includes added/removed deltas, but v1 assumes full rescan)
- Contains significant junk entries (`0000----.com`, etc.) that must be filtered

---

## Core Algorithm

**Single-pass streaming set difference on a pre-sorted file.**

### Batch Phase

1. Load English dictionary + two-word combinations + exhaustive short strings into a HashSet (the candidate set). This is small — megabytes.

2. Stream the 5.6GB file line by line. Never load it fully into memory.

3. For each line, parse the domain name (everything before the first dot) and the TLD.

4. Since the file is sorted, all TLDs for a given name appear on consecutive lines. Track the current name and collect its TLDs:
   - Same name as previous line → add TLD to the current collection
   - New name → flush the previous name

5. On flush: if the name exists in the candidate set, record which TLDs it's registered on. If not in the candidate set, skip entirely — it's irrelevant.

6. After the full pass, two groups exist:
   - Candidate names that appeared in the file → known which TLDs they're registered on. Invert to get available TLDs.
   - Candidate names that never appeared → registered nowhere, available on every TLD. Gold tier.

7. The output is the **available set**: only candidate names and their available TLDs. This is the smallest possible dataset — a fraction of either input.

### Why This Works

- Single sequential pass over the large file. I/O bound, not CPU bound.
- The sorted order provides free deduplication — just compare to previous line.
- Memory usage is bounded by the candidate set (small) plus one name's worth of TLDs (tiny).
- The 5.6GB file streams through and is discarded. Only the available set persists.

---

## Available Set — The Only Thing That Matters

Neither the raw TLD file nor the full dictionary lives in memory during serving. Only the output of the batch — the available set — is held in memory.

If the candidate set has 10M entries and 70% are registered somewhere, the available set is ~3M names with their TLD availability. Estimated ~500MB-1GB in memory. Fits comfortably on the Oracle VM.

This is what users query. This is what gets indexed. This is what gets streamed over SSE.

---

## Double-Buffer Index Swap

Two copies of the available set exist in memory:

- **Active index** — currently serving user queries
- **Standby index** — being rebuilt by the nightly batch

When the batch completes:
1. New available set is fully built in the standby slot
2. Atomic pointer swap — standby becomes active, active becomes stale
3. Stale copy is dropped

Users never see a partial index. No locks on the read path. No query interruption during batch. The swap is instantaneous.

### Rollback

Bad data in today's batch? The previous snapshot file is still on disk. Restart and load the last known good snapshot. Yesterday's data is stale by 24 hours at worst — acceptable for a daily-refresh product.

### Memory Budget

Two full indexes must coexist briefly during the swap window. If the available set is ~1GB, peak memory during swap is ~2GB. Well within the 24GB Oracle VM budget.

---

## Persistence — Snapshot File

The available set is serialized to a binary snapshot file on disk after each batch run. This is not a database. It's a point-in-time dump of the in-memory index — similar to Redis RDB snapshots.

**Purpose:** Crash recovery only. On restart, the Rust service loads the last snapshot and begins serving immediately. No need to re-run the full batch.

**Format:** Binary, not human-readable. Optimized for fast deserialization. Exact format is an implementation decision.

**Lifecycle:**
- Batch completes → serialize new snapshot to disk
- Process starts → load latest snapshot into memory → start serving
- Previous snapshot retained for rollback

---

## Batch Scheduling and Resource Contention

The batch job is I/O bound. Reading 5.6GB sequentially from disk means the CPU is mostly idle, waiting for disk reads. HashSet lookups per line are nanosecond-scale work between relatively long I/O waits.

Serving is CPU bound per request (index lookups, filtering, serialization) but each request is microseconds of work.

These two workloads naturally coexist. The batch doesn't starve serving because it's mostly waiting on disk. If contention is observed, the batch process can be run at lower OS priority (`nice`) so the scheduler gives serving priority. No core pinning — that partitions capacity and guarantees waste.

**v1:** Run batch at off-peak hours (3am). Don't overthink contention until traffic justifies it.

**Future:** If contention becomes real, move batch to a separate container or separate VM. The double-buffer architecture means batch and serving are already decoupled at the data level. Separating them physically requires zero code changes.

---

## Infrastructure

### Oracle Free Tier VM (24GB RAM, 4 Ampere cores)

Runs:
- Rust binary (batch + HTTP server, single process)
- `cloudflared` tunnel daemon

That's it. Two processes.

### Cloudflare (free plan)

- **Cloudflare Pages** — serves the static Next.js frontend (built + exported). Deployed via git push. Global CDN, zero config.
- **Cloudflare Tunnel** — outbound-only connection from Oracle VM to Cloudflare. No inbound ports open on the VM. Zero attack surface.
- **DNS** — routes `justgetdomain.com` to Pages, `api.justgetdomain.com` to the tunnel.

### Deployment

- Docker container for the Rust binary
- Docker container (or sidecar) for `cloudflared`
- Terraform(later) to provision Oracle VM + networking
- Docker + Terraform(later) means portable to any cloud, any provider, no vendor lock

---

## Network Topology

```
Browser
  │
  ├── justgetdomain.com → Cloudflare Pages (static frontend)
  │
  └── api.justgetdomain.com → Cloudflare Edge
                                    │
                                    │ (Cloudflare Tunnel - outbound from VM)
                                    │
                              Rust HTTP Server (localhost, no public port)
```

### Security Layers

- **Network DDoS** → Cloudflare absorbs at edge. Free plan includes basic protection.
- **Server access** → Zero open inbound ports. Tunnel is outbound-only. Attackers would need to compromise Cloudflare's internal network to reach the VM.
- **Application-layer abuse** → Handled by the Rust service (see Connection Hygiene below).

---

## Connection Hygiene (SSE Protection)

SSE connections are persistent. A malicious client can exhaust server resources by opening thousands of connections and holding them indefinitely. Cloudflare does not catch this because each connection looks legitimate.

The Rust HTTP server enforces:

- **Max concurrent connections per IP** — 5. Prevents a single client from monopolizing file descriptors.
- **SSE connection timeout** — 30 seconds of inactivity triggers close. Prevents idle connection hoarding.
- **Max results per stream** — 1000 results then close. Client paginates for more. Bounds memory and duration per connection.

These are resource hygiene, not rate limiting. The server protects itself the way a restaurant limits tables — capacity is finite.

---

## Rust Service — Internal Architecture

Three modules, one binary, one process.

### Module: Ingest
- Reads the 5.6GB sorted domain file
- Parses each line: extracts domain name and TLD
- Deduplicates using sort order (compare to previous line)
- Batch-phase only, never runs during serving

### Module: Compute
- Holds the candidate set (dictionary + combinations + exhaustive shorts)
- Takes output from Ingest (registered names + their TLDs)
- Produces the available set via set difference
- Serializes available set to snapshot file
- Triggers the double-buffer swap
- Batch-phase only

### Module: Serve
- Loads available set into memory (from snapshot on startup, from Compute on swap)
- Exposes HTTP endpoints for search queries
- Streams results via SSE
- Enforces connection hygiene
- Runs continuously

### Trait Boundary

All three modules interact through a defined interface for the index. The Serve module doesn't know how the index was built — it queries through an abstract boundary. This enables:

- Swapping index implementations (HashMap today, trie tomorrow, compressed array later) without touching serving code
- A/B testing different backends behind a load balancer(later)
- Plugging in an LLM ranker as a wrapper that reranks results from any index implementation(later)
- Deploying two instances with different backends, comparing latency(later)

---

## What to Skip for v1

| Technology | Why skip |
|---|---|
| Postgres | Access pattern is index-shaped, not table-shaped. Adds latency vs in-memory. Snapshot file handles persistence. |
| Kafka | One producer, one consumer. Partitions, brokers, offsets are pure overhead. |
| Temporal | Jobs are simple generate-filter-store. No multi-day waits, no complex retry chains. |
| Redis | No caching layer needed when the entire available set fits in memory. |
| Nginx | Cloudflare Tunnel replaces the reverse proxy. |
| Kubernetes | One binary, one VM. Docker compose is sufficient. |
| LLM integration | Manual keyword mapping covers v1. LLM is a v2 luxury for fuzzy intent. |
| Rate limiting | Cloudflare handles DDoS. Connection hygiene handles resource abuse. Build rate limiting when traffic justifies it. |
| Multi-service architecture | One binary does everything. Split when independent scaling needs arise. |

---

## Future Hooks (Not v1)

**Keyword mapping:** Manual curated map of ~500 seed categories to dictionary word roots. "Note taking" → note, jot, scrib, memo, pad, ink, pen, write, mark, log. Query the available set filtered to those roots. No LLM needed.

**LLM ranking:** User describes their product in free text. LLM scores/ranks available domains by relevance and brandability. Pass-through pricing — user pays inference cost directly via Stripe credits, no margin.

**MCP endpoint:** AI agents can query available domains programmatically. Heavy users become paying API customers.

**TLD-specific filtering:** Already supported by the bitset/TLD-set data model. UI surfaces it when ready.

**Daily delta processing:** Data provider supplies added/removed lists. Update the available set incrementally instead of full rescan. Reduces batch time significantly.

**Landing page live counter:** "There are currently 3,847 available 4-letter .com domains." Drives signups because nobody else shows this number. (later)

---

## Build Order

1. Rust service — batch pipeline that reads the sorted file, diffs against English dictionary, outputs available set to terminal
2. Snapshot serialization — persist available set to disk, load on startup
3. HTTP server — expose available set with basic query parameters
4. SSE streaming — stream results to clients
5. Connection hygiene — per-IP limits, timeouts, max results
6. Cloudflare Tunnel — connect Rust service to Cloudflare with zero open ports
7. Next.js frontend — static app on Cloudflare Pages, EventSource to API
8. Docker + Terraform — containerize and provision Oracle VM
9. Two-word combinations — expand candidate set beyond single dictionary words
10. Exhaustive short strings — 3, 4, 5-letter enumeration tier
11. Keyword mapping — category-based search without LLM
12. Double-buffer swap — run batch without interrupting serving

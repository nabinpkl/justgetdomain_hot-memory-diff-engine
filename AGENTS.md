
# Must Do's
- Every backend feature change do docker compose up -d --build at last.

# Don'ts
- No God component if it makes sense to extract to a component do it
- No dead code — if something is removed, delete it entirely (files, imports, types, everything referencing it)
- No backward compatibility layers — this is iteration-based development; just change the code directly

# Writing rules (docs/LinkedInEngineeringPosts/ only)

These rules apply when drafting or editing post content inside `docs/LinkedInEngineeringPosts/`. They do NOT apply to code comments, internal docs, `docs/ProductPositioning/`, or this file.

- No em-dashes. They read as AI-written on sight. Use periods, commas, colons, or parens instead.
- No "X is not Y, it's Z" cadence unless it really earns it.
- Keep the numbers. They do the heavy lifting.
- First person, plain words, short paragraphs.
- Audience is peer engineers and technical hiring managers, not recruiters. Technical terms (O-notation, mmap, asymptotic) stay when they advance the story. Flex-for-flex's-sake (naming libraries just to sound senior) gets cut.
- The post is a log, not content marketing. Skip hook-bait openers. The reader arrived from a resume link, not a scroll.

# JustGetDomain.com

# JustGetDomain.com — Build Context

## What It Is
Domain search inverted. Pre-scan every short domain combination, filter out taken names, present only what's registrable. Users browse availability instead of guessing. Not a registrar — we don't sell domains.

## Candidate Tiers
- **Tier 1:** Single real dictionary words (`desk`, `bloom`, `crisp`). ~10-20K candidates.
- **Tier 2:** Two short words combined, 6-8 chars (`inkdrop`, `sunpath`, `mintpad`). ~5-10M candidates. Primary product surface.
- **Tier 3:** Every possible 3/4/5-letter string regardless of meaning. 3-letter: 17,576. 4-letter: 456,976. 5-letter: 11.8M.
- **Tier 4 (future):** Word + affix (`notely`, `scribr`, `padify`).
- **Tier 5 (future):** Romanized foreign words (`brevio`, `claro`).

## Data Source
Single pre-sorted 5.6GB text file of all registered domains across all TLDs. Updated daily. Sorted alphabetically — all TLDs for a given name appear on consecutive lines.

## Core Algorithm
Single-pass streaming set difference:
1. Load candidate set (dictionary + combos + short strings) into HashSet — megabytes.
2. Stream 5.6GB file line by line. Never load fully.
3. Parse domain name + TLD per line. Sorted order = free grouping by name.
4. On flush: if name is in candidate set, record which TLDs it's registered on. Otherwise skip.
5. Output = **available set**: candidate names + their available TLDs. ~3M names, ~500MB-1GB in memory.

## Available Set
The only thing that matters. Neither raw TLD file nor full dictionary lives in memory during serving. Only the available set. This is what users query, what gets indexed.

## Double-Buffer Index Swap
- Active index serves queries. Standby index rebuilt by nightly batch.
- Batch completes → atomic pointer swap → stale copy dropped.
- No locks on read path. No query interruption. Peak memory ~2GB during swap window.
- Rollback: load previous snapshot file from disk.

## Persistence
Binary snapshot file (like Redis RDB). Crash recovery only. Batch completes → serialize. Process starts → load snapshot → serve immediately. Format: bincode + serde.

## Batch Scheduling
Batch is I/O bound (streaming 5.6GB). Serving is CPU bound per request (microseconds). They coexist naturally. V1: run batch at 3am. Future: separate container if contention arises.

---

## Infrastructure

**Oracle Free Tier VM:** 24GB RAM, 4 Ampere cores. Runs Rust binary + cloudflared. That's it.

**Cloudflare (free plan):**
- Pages — static Next.js frontend via git push
- Tunnel — outbound-only from VM, zero inbound ports
- DNS — `justgetdomain.com` → Pages, `api.justgetdomain.com` → tunnel

**Network topology:**
```
Browser → justgetdomain.com → Cloudflare Pages (static)
Browser → api.justgetdomain.com → Cloudflare Edge → Tunnel → Rust HTTP (localhost)
```

**Security:** Zero open inbound ports. Cloudflare absorbs DDoS. Connection hygiene in Rust service.

---

## `frontend/` stack

- **Framework:** Next.js 16.2.3, App Router, TypeScript, `src/` directory, `@/*` alias
- **Package manager:** pnpm
- **Styling:** Tailwind CSS v4 (CSS-first via `@tailwindcss/postcss`)
- **UI components:** shadcn/ui — all components installed in `src/components/ui/`
- **State:** Zustand v5 (client), TanStack Query v5 (server)
- **Animation:** motion v12 (`motion/react`)
- Color: Every color should be oklch no # based colors (if needed convert first)

## Backend Rust Service Architecture

### Decision: Axum
Axum 0.8.x is the 2026 default. Built on Tokio, via Tower middleware for connection hygiene. Same runtime for batch (tokio::io file streaming) and serving. Single binary, single process.

### Core Crate Stack
#### All latest
tokio
axum
tower
serde
serde_json
rustc-hash         # FxHashSet — faster than std HashMap

### Trait Boundary
Serve module queries an abstract `AvailableIndex` trait. Enables swapping implementations (HashMap → trie → compressed array) or layering an LLM ranker without touching serving code.

### Routes (v1)
```rust
let app = Router::new()
    .route("/health", get(health))
    .route("/stats", get(stats)) (later)
```
No dedicated `/check/{name}` — single-lookup rebuilds the GoDaddy experience we're killing. If someone searches one name, they get one result back instantly.

### Connection Hygiene (Outdated later need to be api rate limiting)
- Max 5 concurrent connections per IP
- 30s inactivity timeout
- Max 1000 results per stream, client paginates
- Implemented via Tower middleware + custom extractors

---

## Dictionary Sources for Candidate Set

**Tier 1 (single words):**
- Primary: 12dicts project, 6of12 list — common words only, rigorously checked, ~10-20K words
- Fallback: `/usr/share/dict/american-english` filtered to ≤6 chars, alpha-only
- Bulk source: dwyl/english-words GitHub repo (479K words) — too big as-is, useful for Tier 2 compound generation

**Filter rules:** No apostrophes, no capitals, no non-alpha chars. Short words only for domain quality.

---


## What to Skip for v1
Postgres, Kafka, Temporal, Redis, Nginx, Kubernetes, LLM integration, rate limiting, multi-service architecture, MCP endpoint, dedicated single-lookup REST endpoint.

## Build Order
1. Rust batch pipeline — read sorted file, diff against dictionary, output available set to terminal
2. Snapshot serialization — binary libary needs to be found out+ persist + load on startup
5. Connection hygiene — Tower middleware
6. Cloudflare Tunnel — zero open ports
7. Next.js frontend — static on Pages, EventSource to API
8. Docker — containerize on Oracle VM
9. Two-word combinations — expand candidate set
10. Exhaustive short strings — 3/4/5-letter enumeration
11. Keyword mapping — category search without LLM
12. Double-buffer swap — batch without interrupting serving

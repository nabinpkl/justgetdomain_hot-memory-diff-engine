# Plan: Domain Search API + Virtual Scroll (Build Order Step 4)

## Context

Step 4 of the build order. The batch pipeline (steps 1-2) produces a 10.3 MB rkyv snapshot with 8,654 dictionary words (scaling to millions), their registered TLDs, and 20,110 unique TLDs. The server needs to load this snapshot and serve domain availability data to two consumers:

- **Browser** — a human scrolling through available domains, browsing by constraints (TLD, word length, sort), discovering names they didn't know to search for. Needs virtual scroll over arbitrarily large result sets without accumulating data in memory.
- **AI agents** — machine consumers that want bulk sequential access to filtered results for processing, export, or downstream pipelines.

### The problem we're solving

Existing domain tools (Vercel, Namecheap, GoDaddy) are **checkers** — you give them a name, they say yes or no. They fail the confused founder who doesn't have a name yet. Our product is a **browser** — filter by TLD and word length, scroll through everything that's actually available, and let something catch your eye. Discovery is the product.

## Key Design Decisions

**Precompute at startup:** Load snapshot, compute `available_tlds = all_tlds - registered_tlds` per word once. Store in `DomainIndex` behind `Arc` (read-only, no locks). Prepend `.` to TLDs to match frontend convention (`.com` not `com`).

**All filtering server-side:** Query, TLD, length, and sort are ALL server-side. Frontend sends everything as query params. Any filter change cancels and re-requests. Frontend just renders what arrives.

**Two endpoints, one index:** Both the paginated REST endpoint (browser) and the NDJSON streaming endpoint (agents) call the same `DomainIndex::search()`. The only difference is delivery — windowed vs sequential.

**Paginated REST for browser, not SSE:** The browser needs random-access windows into the result set (user can jump to any scroll position). SSE/WebSocket stream data sequentially — the client can't say "skip to row 50,000." Paginated REST with virtual scroll keeps browser memory constant (~150-200 records) regardless of total result set size.

**NDJSON streaming for agents:** Agents want everything sequentially. NDJSON (newline-delimited JSON) is the standard — every line is a self-contained JSON object. `curl` prints them as they arrive. Python reads them with a for loop. No SSE framing needed — plain HTTP streaming.

**`fetch` + `AbortController` in frontend:** Any filter/scroll change aborts the previous request. No stale data races.

**200ms debounce on filter changes:** Avoids spamming the server when toggling TLDs or adjusting lengths. Scroll-driven window fetches are NOT debounced — they prefetch ahead of the viewport.

**Pre-sorted indexes for O(1) sort switching:** At millions of entries, sorting per-request is too expensive. Build multiple sort orders at startup. Trade memory for latency.

**Max results:** Paginated endpoint returns up to `limit` per request (default 50). Streaming endpoint has no cap — client disconnection stops the scan.

## API

### Browser — Paginated REST

```
GET /search?tlds=.dev,.sh&lengths=4,5&sort=alpha&offset=0&limit=50

→ {
    "total": 183400,
    "results": [
      { "name": "able", "tlds": [".dev", ".sh"], "length": 4 },
      { "name": "arch", "tlds": [".dev"], "length": 4 },
      ...
    ]
  }
```

Query params (all optional):

- `q` — substring match on word (case-insensitive). Empty/missing = all words.
- `tlds` — comma-separated dot-prefixed TLDs (`.dev,.sh`). Only return entries available on at least one of these. Each entry's `tlds` array is filtered to only the requested TLDs.
- `lengths` — comma-separated word lengths (`3,4,5`). Only return entries matching these lengths.
- `sort` — `alpha` | `tlds` | `shortest` (default: `alpha`). Determines which pre-sorted index is used.
- `offset` — starting position in the filtered result set (default: 0).
- `limit` — number of results to return (default: 50, max: 200).

Response:

- `total` — total number of matching entries (for scrollbar sizing).
- `results` — the requested window of results.

Errors: standard HTTP status codes. 400 for invalid params, 500 for server errors.

### Agent — NDJSON Streaming

```
GET /stream?tlds=.dev&lengths=4&sort=alpha
Accept: application/x-ndjson

→ {"name":"able","tlds":[".dev"],"length":4}
  {"name":"arch","tlds":[".dev"],"length":4}
  {"name":"atom","tlds":[".dev"],"length":4}
  ... (keeps going until done or client disconnects)
```

Same query params as `/search` except no `offset`/`limit`. Results stream as newline-delimited JSON. Client disconnection stops the server-side scan immediately (no wasted work).

Response headers: `Content-Type: application/x-ndjson`, `Cache-Control: no-cache`.

## Backend Changes

### 1. Cargo.toml — add dependencies

```toml
tokio-stream = "0.1"   # for NDJSON streaming
tower-http = { version = "0.6", features = ["cors"] }
```

### 2. src/index.rs — NEW: precomputed domain index

```rust
pub struct DomainIndex {
    /// Pre-sorted entry lists — same data, different orders.
    /// Each sort mode has its own Vec so offset/limit is O(1).
    by_alpha: Vec<IndexedEntry>,
    by_tld_count: Vec<IndexedEntry>,  // most available TLDs first
    by_shortest: Vec<IndexedEntry>,   // shortest words first
}

pub struct IndexedEntry {
    pub word: String,
    pub available_tlds: Vec<String>,  // dot-prefixed
    pub length: usize,
}
```

**`DomainIndex::from_snapshot(snapshot: &Snapshot)`**

- Builds `FxHashSet` of all unique TLDs from snapshot
- For each word: `available = all_tlds - registered_tlds`, prepend dots, skip if zero available
- Asserts that each word's registered TLDs are a subset of all TLDs (data integrity check)
- Builds the entry list sorted alphabetically (`by_alpha`)
- Clones and sorts by TLD count descending (`by_tld_count`)
- Clones and sorts by word length ascending (`by_shortest`)
- Logs total entry count and build time

**`DomainIndex::search(&self, params: &SearchParams) -> SearchResults`**

- Selects the appropriate pre-sorted Vec based on `params.sort`
- Returns a lazy iterator (see below) + total count
- Filter chain applied per entry: substring match → length filter → TLD filter (intersect + skip if empty)
- Each yielded `SearchResult` contains the already-intersected TLDs

**For `/search` (paginated):** Two-pass approach.

1. First pass: count total matching entries (iterate + filter + count). This is O(n) over entries but does no allocation.
2. Second pass: skip `offset`, take `limit`, collect into `Vec<SearchResult>`.

At millions of entries, this double-scan is still fast (in-memory, no I/O). If profiling shows it's a bottleneck, cache filtered result sets per param combination with an LRU.

**For `/stream` (NDJSON):** Returns the lazy iterator directly. No counting, no collecting.

```rust
pub struct SearchResult {
    pub word: String,
    pub tlds: Vec<String>,  // filtered to requested TLDs, or all available if no TLD filter
    pub length: usize,
}
```

### 3. src/handlers.rs — NEW: request handlers

**`search_handler(State(Arc<AppState>), Query(SearchQuery)) → Json<SearchResponse>`**

- Parses query params: `q`, `tlds` (comma-split), `lengths` (comma-split → usize), `sort`, `offset`, `limit`
- Validates `limit` ≤ 200
- Calls `index.search(&params)` — gets total count + windowed results
- Returns `{ total, results }`

**`stream_handler(State(Arc<AppState>), Query(StreamQuery)) → Response`**

- Same param parsing as search (minus offset/limit)
- Uses channel bridge pattern for true streaming:

```rust
let index = state.index.clone();  // Arc clone
let (tx, rx) = tokio::sync::mpsc::channel::<SearchResult>(64);

tokio::task::spawn_blocking(move || {
    for result in index.search_iter(&params) {
        if tx.blocking_send(result).is_err() {
            break;  // receiver dropped = client disconnected
        }
    }
});
```

- Converts `ReceiverStream` to an NDJSON byte stream
- Sets `Content-Type: application/x-ndjson`, `Cache-Control: no-cache`
- Client disconnect → receiver drops → `blocking_send` errors → scan stops

### 4. src/main.rs — wire up server

- Load snapshot at startup, build `DomainIndex`, wrap in `Arc<AppState>`
- Log entry count and index build time
- CORS via `tower_http::cors::CorsLayer` — read allowed origin from `CORS_ORIGIN` env var. Default to `*` for local dev. Log warning at startup if using wildcard.
- Routes: `.route("/search", get(handlers::search_handler))` and `.route("/stream", get(handlers::stream_handler))`
- Pass state via `.with_state(state)`
- Init tracing

### 5. src/lib.rs — add modules

```rust
pub mod index;
pub mod handlers;
```

## Frontend Changes

### 6. src/hooks/use-domain-search.ts — NEW: paginated search hook

```typescript
export function useDomainSearch(params: {
  query: string;
  tlds: Set<string>;
  lengths: Set<number>;
  sort: SortMode;
}) {
  // Returns { total: number, getWindow: (offset, limit) => DomainEntry[], isLoading: boolean }
}
```

**Filter changes (query, tlds, lengths, sort):**

- 200ms debounce
- Abort any in-flight request via `AbortController`
- Fetch `/search?...&offset=0&limit=50` to get new `total` and first window
- Reset scroll position to top
- Clear window cache

**Scroll-driven window fetches:**

- NO debounce — prefetch must be responsive
- Maintain a small cache: ~3 windows (one above viewport, visible, one below)
- On scroll position change, compute which window is needed
- If not in cache, fetch it. Evict oldest cached window if cache is full.
- Abort stale window requests if scroll position changed before they returned

**No client-side filtering** — results are pre-filtered, pre-sorted, and pre-windowed by server.

### 7. src/components/domain-search.tsx — virtual scroll

- Remove `MOCK_DOMAINS` import
- Remove `useMemo` filtering/sorting logic entirely
- Use `useDomainSearch` hook
- Virtual scroll container:
  - Total height = `total * ROW_HEIGHT` (scrollbar sizes correctly for millions)
  - Only render DOM nodes for visible rows + small overscan buffer
  - On scroll, compute visible range, request window if not cached
  - Evict off-screen data from memory
- Can use a library like TanStack Virtual or a lightweight custom implementation

### 8. src/components/home-search.tsx — use hook

- Same hook integration as domain-search.tsx
- Hero collapse still triggers on `query.trim().length > 0`
- Default state (empty query): immediately show results for selected TLDs/lengths — no typing required. This is the discovery experience.

### 9. src/components/domain/domain-data.ts — cleanup

- Remove `MOCK_DOMAINS` (dead code)
- Keep `DomainEntry`, `ALL_TLDS`, `LENGTHS`, `REGISTRARS`, `SortMode`

### 10. .env.local — API base URL

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Not committed to git. Production value set in deployment config.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
│  ┌───────────────────────────────────────────────┐  │
│  │  Virtual Scroll Container                      │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │ Overscan buffer (above) — ~50 rows      │  │  │
│  │  ├─────────────────────────────────────────┤  │  │
│  │  │ Visible rows — ~20-30 rendered DOM nodes│  │  │
│  │  ├─────────────────────────────────────────┤  │  │
│  │  │ Overscan buffer (below) — ~50 rows      │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │  Scrollbar height = total × row_height        │  │
│  │  Memory: ~150 records (not 183,400)           │  │
│  └───────────────────────────────────────────────┘  │
│            │ GET /search?offset=N&limit=50          │
└────────────┼────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│                   Server (Axum)                      │
│                                                      │
│  Arc<DomainIndex>                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │  by_alpha:     [a, b, c, ...]               │    │
│  │  by_tld_count: [x, y, z, ...]  (same data, │    │
│  │  by_shortest:  [i, a, b, ...]   diff order) │    │
│  └─────────────────────────────────────────────┘    │
│       │                         │                    │
│  GET /search              GET /stream                │
│  (offset/limit)           (NDJSON)                   │
│  → { total, results }     → line\nline\nline\n...   │
│       │                         │                    │
└───────┼─────────────────────────┼────────────────────┘
        │                         │
   Browser                   AI Agent / CLI / Script
```

## Files to Create/Modify

**Backend (create):**

- `src/index.rs` — DomainIndex with precomputed available TLDs, pre-sorted indexes, search with offset/limit
- `src/handlers.rs` — `/search` (paginated) and `/stream` (NDJSON) handlers

**Backend (modify):**

- `Cargo.toml` — add `tokio-stream`, `tower-http`
- `src/main.rs` — load snapshot, build index, CORS, routes, tracing
- `src/lib.rs` — add `index` + `handlers` modules

**Frontend (create):**

- `src/hooks/use-domain-search.ts` — paginated search + window cache hook

**Frontend (modify):**

- `src/components/domain-search.tsx` — virtual scroll + hook integration
- `src/components/home-search.tsx` — hook integration
- `src/components/domain/domain-data.ts` — remove `MOCK_DOMAINS`

## Implementation Order

1. Backend: `Cargo.toml` + `index.rs` + `handlers.rs` + `lib.rs` + `main.rs`
2. Test backend: `cargo build --bin server`, then:
   - `curl "http://localhost:3001/search?tlds=.dev&lengths=4&sort=alpha&offset=0&limit=5"` → JSON with total + 5 results
   - `curl "http://localhost:3001/search?tlds=.dev&lengths=4&sort=alpha&offset=100&limit=5"` → different 5 results
   - `curl -N "http://localhost:3001/stream?tlds=.dev&lengths=4"` → NDJSON lines streaming
3. Frontend: `.env.local` + `use-domain-search.ts`
4. Frontend: virtual scroll in `domain-search.tsx` + `home-search.tsx`
5. Frontend: clean up `domain-data.ts`
6. End-to-end test

## Verification

- `cargo build --bin server` compiles
- `cargo run --bin server` starts, loads snapshot, logs entry count + index build time
- `/search` returns correct `total` for various filter combos
- `/search` with different `offset` values returns different windows
- `/search` with `offset` > `total` returns empty results array
- `/stream` streams NDJSON lines that match filter params
- Disconnecting a `/stream` client mid-stream stops server-side scan (check logs)
- Frontend: land on page with TLD/length selected → results appear immediately (no typing)
- Frontend: scroll through results → new windows load seamlessly, no jank
- Frontend: jump scrollbar to middle → correct data loads
- Frontend: change filter → scroll resets, new total, new results
- Frontend: rapid filter changes → only last request completes (abort works)
- Frontend: memory stays flat regardless of scroll depth (check DevTools)

## Future Considerations

- **Search index:** At millions of entries, substring scan is O(n). Consider trigram index or prefix trie for sub-linear search. Doesn't affect API shape — only `DomainIndex` internals change.
- **Cached filter results:** If the same filter combos are requested repeatedly, LRU cache of `(params → sorted entry list)` avoids redundant scans.
- **Snapshot invalidation:** When a new batch run produces a fresh snapshot, push an SSE/WebSocket event to connected browsers so they re-query. This is the one server-initiated event in the system.
- **Semantic sort:** Alphabetical, TLD count, and shortest are mechanical sorts. A "category" or "semantic" sort (grouping animals, verbs, abstract concepts) would dramatically improve the browsing experience for confused founders.
- **Shuffle/random:** Serendipity mode — randomize results so repeat visits surface different names.

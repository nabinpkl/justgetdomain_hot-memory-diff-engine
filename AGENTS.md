# AGENTS.md

Engineer onboarding for the `hot-memory-diff-engine` workspace. For project context (what it is, why it exists, the reframe story) see `README.md`. For performance numbers see `docs/PERFORMANCE.md`. For architectural rationale see `docs/DECISIONS.md`. For deliberately-out-of-scope work see `docs/LIMITS.md`.

---

## Layout

```
.
├── crates/
│   ├── hot-index/                  HotIndex trait + FxHashIndex + HotSwap + persistence (bincode|rkyv)
│   └── streaming-set-diff/         LineParser trait + diff (linear) + diff_sorted (binary search)
├── examples/
│   ├── domain-availability/        Live integration. Backend serves api.justgetdomain.com.
│   │   ├── backend/                Rust (Axum, Tokio). Uses both crates.
│   │   └── frontend/               Next.js. Will move under examples/ in #19.
│   └── breach-password-check/      CLI. Uses streaming-set-diff only. Proves the crate is generic.
├── docs/
│   ├── PERFORMANCE.md              Measured numbers + reproducible commands.
│   ├── DECISIONS.md                ADR-style rationale for each non-obvious choice.
│   ├── LIMITS.md                   What this engine deliberately does NOT do.
│   └── LinkedInEngineeringPosts/   Long-form writeups (different audience).
├── docker-compose.yml              Local dev for the example backend + frontend.
└── Cargo.toml                      Workspace root.
```

---

## Build / run / test

```bash
# Workspace
cargo build --workspace
cargo test --workspace

# Individual crates
cargo test -p hot-index                          # default features
cargo test -p hot-index --features bincode,rkyv  # with both persistence codecs
cargo test -p streaming-set-diff

# Example backend (live demo behind api.justgetdomain.com)
cargo run --release -p domain-availability --bin server
docker compose up -d --build api                 # required after backend feature changes

# Example CLI
cargo run -p breach-password-check -- \
  --corpus     examples/breach-password-check/data/sample-corpus.txt \
  --candidates examples/breach-password-check/data/sample-candidates.txt

# Benches (offline, controlled)
cargo bench -p hot-index
cargo bench -p streaming-set-diff
cargo bench -p hot-index --features long-bench   # adds 10M-entry size
```

---

## Two invariants the code maintains

These are load-bearing — break either and the whole architecture stops working.

1. **The read path never blocks on a writer.** Reads go through `HotSwap::load()`, which is one `Acquire` atomic load + a `Guard` that holds a refcount on the current snapshot. Writers replace the snapshot via `HotSwap::swap(new)` — atomic pointer publish, never blocks readers, drops the old snapshot when the last `Guard` is released.

2. **The build path never mutates the live snapshot.** Each batch builds an entirely new `DomainIndex` (or whatever value `T` you're holding) in scratch memory, then publishes it. There are no per-key updates, no in-place mutations, no read-write locks. This is what makes invariant #1 free.

The unit test `hot_index::tests::readers_see_monotonic_swaps` asserts both — a writer thread doing 1000 swaps in a tight loop concurrent with a reader doing 1000 loads, asserting reads never observe a backwards-moving value.

---

## Conventions

- **No backward-compatibility shims.** This is iteration-based. Change the code directly, delete the old shape.
- **No dead code.** If something is removed, delete it entirely — files, imports, types, every reference.
- **No god components.** Extract a component / module when the boundary is real, not speculatively.
- **Every backend feature change ends with `docker compose up -d --build api`** so the live `api.justgetdomain.com` reflects what's in `main`.
- **Tests are part of crate-extraction done-ness**, not a follow-up. Each library crate ships with unit tests for the load-bearing invariant + at least one test exercising the trait/abstraction with a non-default impl.

---

## Writing rules (`docs/LinkedInEngineeringPosts/` only)

These rules apply when drafting or editing post content inside `docs/LinkedInEngineeringPosts/`. They do NOT apply to code comments, internal docs (`docs/PERFORMANCE.md`, etc.), `docs/ProductPositioning/`, or this file.

- No em-dashes. They read as AI-written on sight. Use periods, commas, colons, or parens instead.
- No "X is not Y, it's Z" cadence unless it really earns it.
- Keep the numbers. They do the heavy lifting.
- First person, plain words, short paragraphs.
- Audience is peer engineers and technical hiring managers, not recruiters. Technical terms (O-notation, mmap, asymptotic) stay when they advance the story.
- The post is a log, not content marketing. Skip hook-bait openers. The reader arrived from a resume link, not a scroll.

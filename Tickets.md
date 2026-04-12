
# This also gives you a killer landing page demo. Show a live counter: "there are currently 3,847 available 4-letter .com domains." That number alone would drive signups because nobody knows it exists.

# Before sketching the full trait and its first implementation — do you want the search to be purely server-side, or have you considered pushing the index to the edge (like a compressed blob in Cloudflare R2 that the Worker queries directly, skipping Oracle entirely for reads)?

# Max concurrent connections per IP — maybe 5
SSE connection timeout — if no interaction for 30 seconds, close it
Max result count per stream — send 1000 results then close, client can paginate


Startup: load last snapshot from disk into memory. Start serving immediately. Then kick off a fresh batch in background if the snapshot is stale.

Daily: batch runs, builds new index, serializes snapshot to disk, swaps active index.
Crash recovery: restart, load snapshot, serving resumes in seconds.

That's the entire Rust architecture. Three modules behind a trait boundary, one binary, one process, one snapshot file on disk.

#
That's a real product: scrape and normalize the changelog from 4-5 major dictionaries, deduplicate, add metadata (source, date added, category, frequency), expose as an API. Developers building word games, NLP tools, content platforms, and... domain search products would pay for it. The irony is JustGetDomain would be its own first customer — new words entering the dictionary are prime Tier 1 domain candidates that nobody else is scanning for yet.

#
A single API that answers: "What words entered mainstream English this week?"
## Spinoff Idea (Product Lab)
**New Words API** — No one aggregates new dictionary additions (Oxford, Merriam-Webster, Cambridge, Dictionary.com) into a single structured feed with timestamps + metadata. Small TAM (word games, NLP/LLM training, domain search, language learning). JustGetDomain would be its own first customer — new dictionary words are prime Tier 1 candidates nobody else scans for. Parked for later.
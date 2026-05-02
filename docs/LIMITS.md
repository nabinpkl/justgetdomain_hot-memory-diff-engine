# Limits  what this engine deliberately does not do

This is a **discovery engine for the gaps in the registered-domain set**, not a recommender. It tells you which short strings are registrable. It does not tell you which ones you *should* register.

## Registrable is not suggestable

The index returns `apple.xyz` if `apple.xyz` is unregistered. The engine has no opinion about whether you should register it. **You should not.** `apple` is one of the most aggressively-protected trademarks in the world, and registering `apple.xyz` is the textbook fact pattern for a UDRP transfer order, a trademark infringement claim, or both.

The same logic applies to:

- **Exact trademarks:** `nike`, `tesla`, `disney`, every Fortune 500 brand, every country-code mark, every famous person's name.
- **Near-misses and typo-squats:** `app1e`, `goggle`, `microsft`. These get caught by the same UDRP "bad faith" framework as exact matches.
- **Confusing similars:** `apple-pay`, `google-search`, anything that incorporates a famous mark plus a generic descriptor.
- **Domain names that imply affiliation:** `apple-support`, `tesla-warranty`, etc.

The engine cannot distinguish these from genuinely-available generic words because **filtering trademarks is a different product**. It needs:

- A live USPTO TESS / WIPO Global Brand Database lookup pipeline.
- Fuzzy matching against a brand corpus (Levenshtein for typos, phonetic algorithms for soundalikes).
- A reviewer queue for ambiguous cases (`apple` the company vs `apple` the fruit-themed startup).
- A "Report a Brand" intake for owners to add their marks to the exclusion list.
- Legal review on a recurring cadence as new marks are registered.

That's a recommender + trust-and-safety pipeline, not an indexing problem. Building it well is more work than building this engine. Building it badly is worse than not building it at all.

## What this means for users

You are 100% responsible for trademark clearance. Run every name you find here through:

- [USPTO TESS](https://tmsearch.uspto.gov/search/search-information) (US trademarks)
- [WIPO Global Brand Database](https://branddb.wipo.int/) (international)
- A web search for the exact string ("is this used as a brand?")
- A Google image search (logo similarity)

If you have any doubt, don't register. The cost of a UDRP loss is the domain plus thousands in arbitration fees. The cost of a real trademark suit is much higher.

## What this means for the project

This is what makes the repo a **builder artifact** instead of a **failed startup**. The engineering problem (microsecond reads from a 5.6 GB nightly-rebuilt corpus on a free-tier VM) is solved and shipped. The unshipped pieces  trademark filtering, registrar partnerships, search ranking  are *deliberately* unshipped because they are a different product I chose not to build, not unfinished work I gave up on.

If you want this to be a real domain-search product, the engine is the easy half. The hard half is the recommender + legal pipeline. That's the half I'm not building.

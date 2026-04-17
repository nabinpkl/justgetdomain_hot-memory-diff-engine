This is claudes important sections captured.

Re-read both sections through both pairs of eyes. Honest reactions.

## Through the recruiter / keyword-scanner lens

They're not reading. They're scanning the profile summary + top pinned post for match signals against the role they're hiring for.

**What they catch:**
- "LeetCode" in the title (hireable word)
- Numbers everywhere (88s, 3.42s, 26x, 5.6 GB, 319M) — pattern-matches as "performance work"
- "binary search", "mmap", "O(k log n)" — maps to "advanced backend" or "systems" roles
- "AI" / "Claude" / "LLM" — modern relevance

**What they miss, that matters:**
- **The language is never named.** Nowhere does the post say "Rust," "Axum," "Tokio." A recruiter filtering for "Rust engineer" searches their saved profile list by keyword and this post doesn't contain the keyword. This is the single biggest problem for the recruiter read.
- **"Performance optimization" as a literal phrase doesn't appear.** The post demonstrates it. Recruiters match strings.
- No hashtags. Not a huge deal but `#rust #systemsengineering #performance` would put it in front of people searching those tags.

## Through the engineer / decision-maker lens

Slower, skeptical read. Looking for "does this person actually think, or is this performance writing?"

**What lands:**
- The problem is concrete. 5.6 GB, 319M lines, sorted file, 8,600 candidates. All specific.
- The reveal ("I re-read the data description I'd been staring at for a week") rings true. Most engineers have had that exact moment.
- The "use binary search isn't even the only right answer" paragraph in the article section. That's the paragraph that separates this from every other LeetCode-vs-LLM post. An engineer notices when someone keeps going past the obvious answer.
- The calculator analogy works. Concrete, not overreaching.
- The NDA framing at the top of the article is sharp positioning.

**What wobbles:**

- **"I asked Claude to make it faster. Got buffered reads, SIMD parsing, rayon parallelism. Solid 2 to 3x wins."** An engineer reads this and pauses. Did you actually run rayon on 4 cores? Because you'd expect closer to 4x from that alone, minus I/O. SIMD parsing is real but specifically helps newline detection. The phrasing implies you *tried* these, but it reads more like "what Claude suggested." If it's the latter, the sentence is vague. If it's the former, the numbers look low. Either way a careful reader smells something off.

- **85 vs 88 inconsistency.** Article line 65 says "85 seconds per run." Everywhere else it's 88. Small but an engineer scanning for honesty will notice.

- **`O(k · log n)` notation appears but the math isn't shown.** An engineer would appreciate one line of "at k=8,600 and n=319M, that's ~240K comparisons vs 319M line reads." That converts jargon into signal. Right now the notation is name-dropping.

- **"Anyone can look that up" about binary search** is a bit glib. Binary searching a sorted mmap with prefix-walk-forward has edge cases (line boundary detection, group start walkback) that aren't in any textbook. A senior reader might think "sure, but actually writing this correctly is more than a lookup." Consider softening to "The algorithm is well-known" or similar.

- **The extended calculator analogy has one weak sentence.** "It doesn't tell you that your equation assumed the inputs were independent when they weren't" is doing less work than its neighbors and slows the rhythm. Cut it and the paragraph snaps.

- **"Notes for iteration" block** still at the bottom of the file. Fine for the draft file, but that gets deleted before publishing. Easy to forget.

## About the hiring pipeline point

You're right that there's no universal path, but the two-reader model covers it:

- Pure-recruiter path: they decide if the engineer gets called. Keyword matching.
- Engineering-manager path: they do both roles. Substance matters more.
- Direct-to-engineer path: substance only, keywords are noise.

All three care about **the substance being real** (which the engineer reader catches) and about **searchable keywords being present** (which the recruiter needs). These aren't in conflict. You just need both. The post currently over-indexes on substance and under-indexes on keywords.

## Concrete fixes, ranked by impact

1. **Name the stack once.** Somewhere in the first two paragraphs of each section, drop "In Rust" or "(Rust, mmap'd file, tokio)". Single word, huge recruiter-search delta, no cost to the engineer read.
2. **Fix the 85 vs 88 inconsistency.** 10 seconds.
3. **Tighten the "2 to 3x wins" line.** Either be specific about what you actually ran ("Claude suggested buffered reads, SIMD newline detection, rayon parallelism. I tried the first two; ~2x.") or make it clearly hypothetical ("All the suggestions Claude could offer would have landed in the 2-3x range.").
4. **Add one line of math to the O(k log n) reveal.** Converts notation into signal.
5. **Cut the weak calculator sentence.**
6. **Consider adding 3 hashtags at the bottom.** `#rust #systemsengineering #performance`. Ugly but functional. You can test both versions.
7. **Remove "Notes for iteration" block before shipping.** (This is a pre-publish checklist item, not a writing change.)

## The bigger decision

Fix 1 (naming Rust) is non-negotiable. The others are editorial taste. Want me to apply fixes 1, 2, and 5 (stack name, number consistency, trim the calculator sentence) as a batch, and leave the more subjective ones (#3 phrasing of the Claude line, #4 math explainer, #6 hashtags) for you to decide?
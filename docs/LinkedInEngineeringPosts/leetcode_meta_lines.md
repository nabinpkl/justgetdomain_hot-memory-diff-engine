## Notes for iteration

Things to consider adding or cutting:

- A screenshot of `/stats` showing `last_scan_kind: binary` and `last_scan_kind: linear` side by side with `last_scan_elapsed_ms`. The swap architecture in `backend/src/scanner.rs` exists so this is a one env var flip, not a git checkout.
- A before/after code block. Naive linear scan, then the binary search loop. Short enough to fit in the post.
- Drop the "invert a binary tree" line if it reads too much like every other LeetCode take on the timeline.
- The calculator analogy can move higher if the opening feels slow.
- Consider killing the final one line zinger if it feels written for the screenshot. Plain last paragraph might land harder.


# Meta: strong lines, reusable components

Raw reservoir of sharp phrasings from the LeetCode-at-scale drafts. Not a draft. Plug and unplug as the post shape changes.

Rules inherited from the main draft file:

- No em-dashes.
- No "X is not Y, it's Z" unless it earns it.
- Keep the numbers loud.
- First person, plain words.

---

## 1. Closers and zingers

Lines strong enough to end a post on.

- **Implementation you can hand to an LLM. Noticing, you can't. Not yet.**
  The load-bearing line of the whole piece. Works as LinkedIn close and as article close. The "Not yet." is doing real work. Do not cut.

- **88 seconds to 3.42 seconds. Same machine, same file, same output. One line of reading comprehension.**
  Use when closing with the metric. Pairs well after a philosophical paragraph because it snaps back to concrete.

- **26x from one line of reading comprehension.**
  Compressed variant for inline use, mid-post.

- **The wrong algorithm, tuned beautifully, is still the wrong algorithm.**
  Drop anywhere you want the "optimizing the wrong thing" point to land hard.

- **You get faster at being wrong.**
  Short. Punchy. Standalone paragraph.

## 2. Thesis statements

Different framings of the core claim. Pick one, don't stack them.

- The bottleneck was never implementation. It was noticing the invariant existed.
- The reflex is the whole skill. The implementation is a lookup.
- The grind trains a reflex: stare at any input and ask what's sorted, what's monotonic, what you can exploit.
- Production data arrives with invariants, and the people who ship fast systems are the ones who see those invariants without being told.

## 3. Analogies

- **Calculator (short form):** Same reason learning addition by hand still matters in the calculator era. The calculator handles arithmetic. It won't tell you when you asked the wrong question.

- **Calculator (extended):** The calculator doesn't tell you when you asked the wrong question. It doesn't tell you that your equation assumed the inputs were independent when they weren't. It computes exactly what you typed, faster than you can, and hands you a wrong answer with total confidence.

- **LeetCode reframed:** LeetCode doesn't matter because you'll be asked to invert a binary tree on the job. It matters because production data arrives with invariants.

## 4. Hooks (openers)

Different first lines depending on post shape and audience.

- **Story-first:** Spent a few weekends on a project: a domain search tool that flips the usual flow.
- **NDA-first:** You don't see many posts like this because most production wins live behind NDAs.
- **Metric-first:** 88 seconds to 3.42 seconds. Same machine, same file, same output. (Works as opener or closer.)
- **Claude-first:** I asked Claude to make it faster. Got buffered reads, SIMD parsing, rayon parallelism. Solid 2 to 3x wins. (Good if the audience cares about the LLM angle before the story.)

## 5. The reveal beat

The pacing pivot. Two or three short sentences that turn the post.

- Then I re-read the data description I'd been staring at for a week.
- The file is sorted alphabetically.
- Once you notice that property, the problem reshapes.

Keep these as their own paragraphs. White space around them is the effect.

## 6. Anti-pattern phrasing

For showing what you do without the reflex.

- Without the reflex you optimize inside the shape you already chose.
- You add buffers. You go parallel. You profile and shave constants. You get faster at being wrong.
- An LLM pointed at the same code will help you do all of that faster than you could alone.

## 7. Framing and positioning

The meta-claim about why this post exists.

- You don't see many posts like this because most production wins live behind NDAs. Engineers ship real speedups at their day job and the numbers never leave the internal wiki.
- The before and after are real.
- Most production wins like this stay behind a company NDA forever, which is why you rarely see the actual before and after.
- This is a project that isn't a business. Domain squatting laws are a separate conversation for a separate legal team.

## 8. LLM counterpoint (defusing the "just ask Claude" reply)

- Claude was perfectly capable of writing that binary search. The moment I said "the file is sorted, binary search it," the implementation was immediate and correct.
- LLMs will implement whatever algorithm you hand them, faster and cleaner than you'd write yourself. What they don't do, at least not yet, is read the data description for you and notice that the file was sorted all along.
- I asked Claude to make it faster. Got buffered reads, SIMD parsing, rayon parallelism. Solid 2 to 3x wins.

## 9. The multiple-solutions angle

Underused. Shows the point isn't binary search specifically.

- "Use binary search" isn't even the only right answer.
- A linear scan that terminates once it passes the last candidate alphabetically would also win dramatically, because it also exploits the sort.
- A sort aware merge would win too.
- Three correct answers, all a big multiple faster than the naive version, and all start at the same observation.

## 10. The "free lunch you threw away" angle

- Someone did work to sort that file. The filesystem stores it sorted. Every day, forever, that work exists whether I use it or not.
- Choosing not to use it isn't free. It costs 85 seconds per run, compounding across every rebuild, every retry, every debug loop.
- The file is sorted, and the naive code is throwing that gift away.

## 11. Hard numbers (never drop these)

- 5.6 GB file
- 319 million lines
- ~8,600 candidate names
- 88 seconds (naive linear)
- 3.42 seconds (binary search on mmap)
- 26x speedup
- O(k log n) vs O(n)
- One daily refresh, so the cost compounds

## 12. Concrete anchors (product surface)

When readers ask what the project actually is.

- A domain search tool that flips the usual flow.
- Instead of guessing names and checking availability one by one, pre-scan every short candidate, filter out what's already registered, and show you only names you can actually buy.
- Diff ~8,600 candidate names against a 5.6 GB file with 319 million registered domains.

---

## How to use this file

When rewriting the post:

1. Pick one thesis line (section 2). Don't stack multiple.
2. Pick one closer (section 1). Same rule.
3. Pick one hook (section 4).
4. Keep the reveal beat (section 5) intact — it's the load-bearing rhythm of the piece.
5. Keep all hard numbers (section 11) and the LLM counterpoint (section 8). Those are what make this post unfakeable.
6. Pick one analogy (section 3). Two is too much.
7. Optional flavor from sections 6, 7, 9, 10 based on length budget.

If a line isn't in this file, it's scaffolding. Cut freely.

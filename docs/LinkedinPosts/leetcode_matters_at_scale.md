# LeetCode matters at scale

Two drafts of the same idea. The short one is for LinkedIn, the long one is the article version. Iterate here, not in a Google Doc.

Rules for this file:

- No em-dashes. They read as AI-written on sight.
- No "X is not Y, it's Z" cadence unless it really earns it.
- Keep the numbers. They do the heavy lifting.
- First person, plain words, short paragraphs.

---

## Section 1: LinkedIn short

Spent some weekends on a domain search tool that scans a 5.6 GB file (319M lines) against ~8,600 candidate names.

I was exploring a simple domain search tool. The idea is to flip how you usually look for a domain. Instead of guessing names and checking availability one by one, pre-scan every short candidate, filter out what's already registered, and show you only names you can actually buy.


First version: walk every line, hash check the name, aggregate. Clean code. Correct output. Several minutes per run.

I asked Claude to make it faster. Got buffered reads, SIMD parsing, rayon parallelism. Solid 2 to 3x wins on a problem that needed 100x.

Then I re-read the data description I'd been staring at for a week.

The file is sorted alphabetically.

Binary search the mmap'd file for each candidate instead of walking it. O(k log n) instead of O(n). Minutes collapsed to seconds. Same hardware, same file, same output.

Claude wrote the binary search in one shot the moment I asked for it. The bottleneck was never implementation. It was noticing the invariant existed.

That's what the "LeetCode is just interview trivia" take misses. The grind doesn't teach you to implement binary search. You can look that up. It trains a reflex: look at any input and ask what's sorted, what's monotonic, what you can exploit.

Without the reflex you optimize inside the shape you already chose. You get faster at being wrong. The wrong algorithm, tuned beautifully, is still the wrong algorithm.

It's the same reason learning addition by hand still matters in the calculator era. The calculator handles arithmetic. It doesn't tell you when you asked the wrong question.

Implementation you can hand to an LLM. Noticing, you can't. Not yet.

---

## Section 2: Article

### The 5.6 GB file that taught me LeetCode was never about LeetCode

I'm building a domain search tool. The idea is to flip how you usually look for a domain. Instead of guessing names and checking availability one by one, pre-scan every short candidate, filter out what's already registered, and show you only names you can actually buy.

The data source is a single sorted text file that refreshes daily. 5.6 GB. 319 million lines. One `name.tld` per line.

The job sounds trivial. Take around 8,600 candidate names, figure out which TLDs are already taken for each, persist the rest. I wrote the naive version first. Walk every line of the file, split on the first dot, hash check the name against my candidate set, aggregate. Clean code. Correct output.

It took several minutes per run.

I asked Claude to make it faster. I got exactly what you'd expect. Buffered reads. Byte level parsing instead of `String::split`. A suggestion to parallelize with rayon. All good advice. All 2 to 3x wins on a problem that needed a 100x.

Then I re-read the data description. The file is sorted alphabetically. Every line with the same name sits on consecutive lines. I already knew that. The provider's docs said so. I'd been staring at it for a week.

Once you notice that property, the problem reshapes. You don't need to read 319 million lines to find 8,600 names. You binary search the mmap'd file for each candidate, walk forward until the prefix stops matching, record the TLDs, move on. `O(k · log n)` instead of `O(n)`. On the same hardware with the same input, minutes collapsed into seconds.

Here's what bothered me afterward. Claude was perfectly capable of writing that binary search. The moment I said "the file is sorted, binary search it," the implementation was immediate and correct. The bottleneck wasn't implementation. The bottleneck was noticing the invariant existed.

This is what LeetCode actually trains, and it's why the "it's just interview trivia" argument misses the point. The grind isn't teaching you to implement binary search. Anyone can look that up. It's teaching you to look at an input and automatically ask: what's sorted, what's monotonic, what's bounded, what property does this data have that I could exploit? That reflex is the whole skill. The implementation is a lookup.

Without the reflex, you optimize within the shape you've already chosen. You add buffers. You go parallel. You profile and shave constants. You get faster at being wrong. An LLM pointed at the same code will help you do all of that faster than you could alone, and the wrong algorithm, lovingly tuned, is still the wrong algorithm.

The sharper version of the lesson is that "use binary search" isn't even the takeaway. A linear scan that terminates once it passes the last candidate alphabetically would also win dramatically, because it also exploits the sort. A sort aware merge would win too. There are at least three correct answers, all 10 to 100x faster than the naive version, and they all start at the same observation. The file is sorted, and the naive code is throwing that gift away.

Someone did work to sort that file. The filesystem stores it sorted. Every day, forever, that work exists whether I use it or not. Choosing not to use it isn't free. It costs minutes per run, compounding across every rebuild, every retry, every debug loop.

This is the same reason learning addition by hand still matters in the calculator era. The calculator doesn't tell you when you asked the wrong question. It doesn't tell you that your equation assumed the inputs were independent when they weren't. It computes exactly what you typed, faster than you can, and hands you a wrong answer with total confidence. The thing you can't offload to the calculator is the judgment about what to compute in the first place.

LLMs sit in the same spot now. They will implement whatever algorithm you hand them, faster and cleaner than you'd write yourself. What they don't do, at least not yet, is read the data description for you and notice that the file was sorted all along.

LeetCode doesn't matter because you'll be asked to invert a binary tree on the job. It matters because production data arrives with invariants, and the people who ship fast systems are the ones who see those invariants without being told. The implementation you can offload. The noticing, you can't. Not yet.

Minutes to seconds. Same machine, same file, same output. One line of reading comprehension.

---

## Notes for iteration

Things to consider adding or cutting:

- A screenshot of `/stats` showing `last_scan_kind: binary` and `last_scan_kind: linear` side by side with `last_scan_elapsed_ms`. The swap architecture in `backend/src/scanner.rs` exists so this is a one env var flip, not a git checkout.
- A before/after code block. Naive linear scan, then the binary search loop. Short enough to fit in the post.
- Drop the "invert a binary tree" line if it reads too much like every other LeetCode take on the timeline.
- The calculator analogy can move higher if the opening feels slow.
- Consider killing the final one line zinger if it feels written for the screenshot. Plain last paragraph might land harder.

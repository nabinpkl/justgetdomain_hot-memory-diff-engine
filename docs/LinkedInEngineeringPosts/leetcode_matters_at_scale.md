# LeetCode matters at scale

Two drafts of the same idea. The short one is for LinkedIn, the long one is the article version. Iterate here, not in a Google Doc. Folder-wide writing rules live in `AGENTS.md`.

---

## Section 1: LinkedIn short

why leetcode still matter (Calculator analogy)
it might not matter every day but on scale it really makes the difference.

Spent a few weekends on a project: a domain search tool that flips the usual UX. Instead of guessing names one at a time to see what's taken, pre-scan every short candidate and surface only what's actually available.

The scan job is the interesting part. Set diff ~7,586 candidate names against a 5.6 GB file with 319 million registered domains, write out the available set.

First version was naive. Walk every line, split on the first dot, hash check the name, aggregate. Clean code. Correct output. 80-90 seconds per run in Rust.

I asked Claude to make it faster. It suggested buffered reads, SIMD parsing, rayon parallelism. Micro-optimizations. Each good for 2 to 3x.

Then I re-read the data description I'd been staring at for a week.

The file is sorted alphabetically.

Binary search the mmap'd file for each candidate instead of walking it. O(k log n) instead of O(n). 80-90 seconds dropped to 2-4 seconds. Same hardware, same file, same output. 26x from one line of reading comprehension.

Claude wrote the binary search in one shot the moment I asked for it. The bottleneck was never implementation. It was noticing the invariant existed.

That's what the "LeetCode is just interview trivia" take misses. The grind doesn't teach you to implement binary search. You can look that up. It trains a reflex: stare at any input and ask what's sorted, what's monotonic, what you can exploit.

Without the reflex you optimize inside the shape you already chose. You get faster at being wrong. The wrong algorithm, tuned beautifully, is still the wrong algorithm.

Same reason learning addition by hand still matters in the calculator era. The calculator handles arithmetic. It won't tell you when you asked the wrong question.

Implementation you can hand to an LLM. Noticing, you can't. Not yet.

P.S. The reason this post has real numbers in it is that the data and the code are mine. Most production wins like this stay behind a company NDA forever, which is why you rarely see the actual before and after.

#rust #systemsengineering #performance

---

## Section 2: Article

### The 5.6 GB file that taught me LeetCode was never about LeetCode

You don't see many posts like this because most production wins live behind NDAs. Engineers ship real speedups at their day job and the numbers never leave the internal wiki. I can show you this one because the data and the code are mine, on a project that isn't a business (domain squatting laws are a separate conversation, for a separate legal team). The before and after are real.

I'm building a domain search tool. The idea is to flip how you usually look for a domain. Instead of guessing names and checking availability one by one, pre-scan every short candidate, filter out what's already registered, and show you only names you can actually buy.

The data source is a single sorted text file that refreshes daily. 5.6 GB. 319 million lines. One `name.tld` per line.

The job sounds trivial. Take around 7,586 candidate names, figure out which TLDs are already taken for each, persist the rest. I wrote the naive version first, in Rust. Walk every line of the file, split on the first dot, hash check the name against my candidate set, aggregate. Clean code. Correct output.

It took 80-90 seconds per run.

Rust was deliberate. The point of the exercise was to see the algorithmic floor, not language overhead. Twenty minutes in Python would have made the optimization story "rewrite it in a faster language," which isn't interesting. With Rust out of the way, the 80-90 seconds is pure algorithm cost, and the speedup later is pure algorithm win.

I asked Claude to make it faster. It suggested exactly what you'd expect. Buffered reads. Byte level parsing instead of `String::split`. Parallelize with rayon. All good advice. Every one a 2 to 3x micro-optimization.

Then I re-read the data description. The file is sorted alphabetically. Every line with the same name sits on consecutive lines. I already knew that. The provider's docs said so. I'd been staring at it for a week.

Once you notice that property, the problem reshapes. You don't need to read 319 million lines to find 7,586 names. You binary search the mmap'd file for each candidate, walk forward until the prefix stops matching, record the TLDs, move on. `O(k · log n)` instead of `O(n)`. At k=7,586 and n=319M, that's roughly 212K comparisons instead of 319M line reads, about 1,500x less work in theory. On the same hardware with the same input, 80-90 seconds dropped to 2-4 seconds. The wall clock win is 26x, not 1,500x, because memory bandwidth floors it once work isn't the bottleneck.

Here's what bothered me afterward. Claude was perfectly capable of writing that binary search. The moment I said "the file is sorted, binary search it," the implementation was immediate and correct. The bottleneck wasn't implementation. The bottleneck was noticing the invariant existed.

That's what the "LeetCode is just interview trivia" take misses. The grind doesn't teach you to implement binary search. Anyone can look that up. The grind trains a reflex: stare at any input and automatically ask what's sorted, what's monotonic, what's bounded, what property does this data have that you can exploit. The reflex is the whole skill. The implementation is a lookup.

Without the reflex, you optimize within the shape you've already chosen. You add buffers. You go parallel. You profile and shave constants. You get faster at being wrong. An LLM pointed at the same code will help you do all of that faster than you could alone, and the wrong algorithm, lovingly tuned, is still the wrong algorithm.

The sharper version of the lesson is that "use binary search" isn't even the only right answer. A linear scan that terminates once it passes the last candidate alphabetically would also win dramatically, because it also exploits the sort. A sort aware merge would win too. Three correct answers, all a big multiple faster than the naive version, and all start at the same observation. The file is sorted, and the naive code is throwing that gift away.

Someone did work to sort that file. The filesystem stores it sorted. Every day, forever, that work exists whether I use it or not. Choosing not to use it isn't free. It costs 80-90 seconds per run, compounding across every rebuild, every retry, every debug loop.

This is the same reason learning addition by hand still matters in the calculator era. The calculator doesn't tell you when you asked the wrong question. It computes exactly what you typed, faster than you can, and hands you a wrong answer with total confidence. The judgment about what to compute in the first place is the part you can't offload.

LLMs sit in the same spot now. They will implement whatever algorithm you hand them, faster and cleaner than you'd write yourself. What they don't do, at least not yet, is read the data description for you and notice that the file was sorted all along.

LeetCode doesn't matter because you'll be asked to invert a binary tree on the job. It matters because production data arrives with invariants, and the people who ship fast systems are the ones who see those invariants without being told. The implementation you can offload. The noticing, you can't. Not yet.

80-90 seconds to 2-4 seconds. Same machine, same file, same output. One line of reading comprehension.

---

## Notes for iteration

Things to consider adding or cutting:

- A screenshot of `/stats` showing `last_scan_kind: binary` and `last_scan_kind: linear` side by side with `last_scan_elapsed_ms`. The swap architecture in `backend/src/scanner.rs` exists so this is a one env var flip, not a git checkout.
- A before/after code block. Naive linear scan, then the binary search loop. Short enough to fit in the post.
- Drop the "invert a binary tree" line if it reads too much like every other LeetCode take on the timeline.
- The calculator analogy can move higher if the opening feels slow.
- Consider killing the final one line zinger if it feels written for the screenshot. Plain last paragraph might land harder.

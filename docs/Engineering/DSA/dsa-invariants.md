
### The invariant was in the docs: An 8x speedup I almost missed

I'm building a domain search tool. The idea is to flip the UX of how you usually look for a domain. Instead of guessing names and checking availability one by one, pre-scan every short candidate, filter out what's already registered, and show you only names you can actually buy.

So the goal was: Scan 319 million lines (5.6GB) to find availability for ~7,500 candidates.

You don't see many posts like this because most production wins live behind NDAs. Engineers ship real speedups at their day job and the numbers never leave the internal wiki. I can show you this one because the data and the code are mine, on a project that isn't a business. The before and after are real.

The data source is a single text file that refreshes daily. 5.6 GB. 319 million lines. One `name.tld` per line.

#### The naive version

The job: take around 7,586 candidate names, figure out which TLDs are already registered for each, persist the rest. I wrote the naive version first, in Rust, release build. Walk every line of the file, split on the first dot, hash check the name against my candidate set, aggregate. Clean code, correct output.

It took 18 to 20 seconds per run.

I picked Rust because the whole thesis of justgetdomain is that a commodity utility like this should be free and fast, and users wait on the scan every time the snapshot rebuilds. So 18 to 20 seconds was pure algorithm cost, no language overhead hiding in the number.

I asked Claude to make it faster. It suggested exactly what you'd expect. Buffered reads. Byte-level parsing instead of `String::split`. Parallelize with rayon. All good advice. Every one a 2 to 3x micro-optimization, stacking to maybe 8 to 12x if everything compounded cleanly.

#### Noticing the invariant

Then I re-read the data description. The file is sorted alphabetically. Every line with the same name sits on consecutive lines. I already knew that. The provider's docs said so. I'd been staring at it for a week.

Once you notice that property, the problem reshapes. You don't need to read 319 million lines to find 7,586 names. You binary search the mmap'd file for each candidate, walk forward until the prefix stops matching, record the TLDs, move on. `O(k log n)` instead of `O(n)`. At `k=7,586` and `n=319M`, that's roughly 212K comparisons instead of 319M line reads.

On the same hardware, same input, 18 to 20 seconds dropped to 2 to 3 seconds. About 8x. Numbers are ranges across several release-mode runs.

Binary search wasn't the only fix. A linear scan that terminates past the last candidate would work too, so would a sort-aware merge. Same observation, three correct answers.

Here's the part that matters. Claude was perfectly capable of writing that binary search. The moment I said "the file is sorted, binary search it," the implementation was immediate and correct. The bottleneck wasn't implementation. The bottleneck was noticing the invariant existed.

And look at the numbers side by side. The stacked micro-optimizations Claude suggested could have landed somewhere in the 8 to 12x range if everything compounded, which overlaps with the invariant win. The magnitudes are comparable. The question was never which gives the bigger win. The question was which one I would have gotten to without reading the data description.

The micro-op path is where an LLM naturally leads you, because those patterns live all over its training data. Buffered reads, SIMD, parallelism. These are the right answer to a large class of problems. They just weren't the right answer to this one, and nothing in the code itself tells you that.

#### The reflex, not the algorithm

The real skill isn't implementing binary search. Anyone can look that up. It's the reflex: stare at any input and automatically ask what's sorted, what's monotonic, what's bounded, what property does this data have that you can exploit. The reflex is the whole skill. The implementation is a lookup.

Without the reflex, you optimize within the shape you've already chosen. You add buffers. You go parallel. You profile and shave constants. You get faster at being wrong. An LLM pointed at the same code will help you do all of that faster than you could alone, and the wrong algorithm, lovingly tuned, is still the wrong algorithm.

The sharper version of the lesson is that binary search isn't even the only right answer here. A linear scan that terminates once it passes the last candidate alphabetically would also win substantially, because it exploits the sort. A sort-aware merge would win too. Three correct answers, all faster than the naive version, all starting from the same observation. The file is sorted, and the naive code is throwing that gift away.

Someone did work to sort that file. The filesystem stores it sorted. Every day, forever, that work exists whether I use it or not. Choosing not to use it isn't free. It costs 18 to 20 seconds per run, compounding across every rebuild, every retry, every debug loop.

#### Why 8x and not 1000x

There's a systems footnote worth adding. The observed 8x undershoots what pure algorithmic math predicts (212K ops vs 319M ops suggests closer to 1000x). The gap lives in the memory hierarchy. Linear scan pulls every page of a 5.6 GB file through the OS cache. Binary search only touches the pages its probes land on, a tiny fraction of the file. On repeated runs with a warm page cache, binary search can drop under a second, while linear scan doesn't improve at all because the file is too big to stay cached. The algorithmic win and the memory hierarchy win compound in the direction of the approach that noticed the invariant. Easy to miss if you benchmark once and report a single number.

#### What you can't offload

This is the same reason learning addition by hand still matters in the calculator era. The calculator doesn't tell you when you asked the wrong question. It computes exactly what you typed, faster than you can, and hands you a wrong answer with total confidence. The judgment about what to compute in the first place is the part you can't offload.

LLMs sit in the same spot now. They will implement whatever algorithm you hand them, faster and cleaner than you'd write yourself. What they don't do, at least not yet, is read the data description for you and notice that the file was sorted all along.

Production data arrives with invariants. The engineers who ship fast systems are the ones who see those invariants without being told. The implementation you can offload. The noticing, you can't. Not yet.
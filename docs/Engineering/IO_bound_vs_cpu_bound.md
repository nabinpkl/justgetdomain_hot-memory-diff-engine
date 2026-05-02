

Exactly. Core pinning doesn't create capacity. It just reshuffles the same pie. You're right to catch that.

**But here's the insight you're missing: the batch job is I/O bound, not CPU bound.**

What does the batch actually do? Read a line from disk. Parse a string. Compare to previous string. Maybe do one HashSet lookup. That's nanoseconds of CPU per line. The bottleneck is reading 5.6GB from disk sequentially. The CPU is mostly idle waiting for the next disk read.

So during batch, your 4 cores aren't actually contested. The batch barely uses one core. It's sitting in `read()` syscalls most of the time. Serving continues on all 4 cores effectively unaffected.

**But assume you're wrong about this. Assume the batch is CPU-heavy. What then?**

This is where Linux process scheduling teaches you something real. Instead of pinning cores, use `nice` levels. Run the batch at lowest priority. The OS scheduler then does something elegant:

- If serving needs all 4 cores  batch gets almost nothing, pauses naturally
- If serving is idle  batch gets all 4 cores, finishes fast
- If serving is moderate  batch fills the gaps

You're not reserving capacity. You're saying "serve users first, batch gets leftovers." The total throughput is maximized because no core ever sits idle.

**And this is the real scaling lesson:** the best resource management is not partitioning, it's prioritization. Partitioning (core pinning) guarantees waste  pinned cores sit idle when the assigned workload doesn't need them. Priority-based scheduling wastes nothing.

**The next level of that same lesson:** when priority-based scheduling on one machine isn't enough, you scale horizontally. Second VM. Batch runs there, serving runs here. But that's the same principle  separation by priority, just across machines instead of processes.

**For your learning lab, try both.** Run batch without `nice`, measure serving latency. Run with `nice -n 19`, measure again. You'll see the difference is tiny because the batch is I/O bound anyway. But you'll have proven it with data, which is worth more than any architecture doc telling you so.

What's next?

# Rate limiting
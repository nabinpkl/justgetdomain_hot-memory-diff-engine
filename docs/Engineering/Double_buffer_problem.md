
# What is double buffer problem.

This is a classic blue-green / double-buffer problem.

Classic double-buffer pattern.
Two copies of the index exist at all times. One is "active" serving users. One is "standby" being rebuilt by the nightly batch. When the batch finishes, you atomically swap a pointer. Active becomes stale, standby becomes active. Drop the old one.
Users never see a partial index. They never hit a lock. They never experience a slow query because the batch is competing for CPU or memory. The swap is instantaneous  one atomic pointer flip.
For Postgres it's the same idea. Two tables (or schemas). Batch writes into the shadow table. When complete, rename tables in a transaction. available_domains becomes available_domains_old, available_domains_new becomes available_domains. One transaction, milliseconds.
This also gives you rollback for free. Bad data in today's batch? Swap back to yesterday's index. The old copy is still there until you explicitly drop it.
The daily batch then has zero coupling to serving:

Different thread pool (or even different process)
Writes to a completely separate memory region / table
No locks shared with the read path
Swap happens once, atomically, at the end

The only constraint is memory  you need room for two full indexes simultaneously during the swap window. If the index is 9GB, you need ~18GB during that brief overlap. Fits in 24GB but tight. Worth considering whether you compress the standby copy or whether you accept the peak.
What's next  how the user-facing query path should work, or how the batch ingestion pipeline flows?
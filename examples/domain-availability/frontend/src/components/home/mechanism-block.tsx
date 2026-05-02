const READ_PATH = [
  {
    metric: "35 ns",
    text: "FxHashMap lookup at 1M entries  2x std::HashSet (controlled bench)",
  },
  {
    metric: "47 ns",
    text: "HotSwap::load() overhead  one Acquire atomic load + Guard refcount, never blocks readers",
  },
  {
    metric: "4 µs / 858 µs",
    text: "p50 / p99 whole-handler latency from the live /stats histogram",
  },
  {
    metric: "~115 MiB",
    text: "RSS serving the full 7,586-entry × 1,012-TLD index",
  },
];

const BUILD_PATH = [
  {
    metric: "623 MiB/s",
    text: "sort-aware diff_sorted at 1M lines  5x the naive linear scan",
  },
  {
    metric: "O(k · log n)",
    text: "binary search per candidate against the sorted source, single mmap pass",
  },
  {
    metric: "atomic swap",
    text: "new index built in scratch memory, then arc-swap publish  no read locks, no per-key writes",
  },
  {
    metric: "143 ms",
    text: "rkyv-framed snapshot cold-load on boot (7,586 entries, 1,012 TLDs)",
  },
];

function PathCard({
  label,
  crate,
  crateHref,
  title,
  bullets,
}: {
  label: string;
  crate: string;
  crateHref: string;
  title: string;
  bullets: { metric: string; text: string }[];
}) {
  return (
    <div className="rounded-sm border border-jgd-border bg-jgd-surface/30 px-7 py-7">
      <p className="text-[0.72rem] uppercase tracking-[3px] text-jgd-accent/80 mb-3">
        {label}
        <span className="text-jgd-muted/70 mx-2" aria-hidden>
          ·
        </span>
        <a
          href={crateHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono normal-case tracking-normal text-jgd-accent hover:underline underline-offset-4"
        >
          {crate}
        </a>
      </p>
      <h3 className="font-serif text-[1.25rem] font-normal text-jgd-text mb-5 leading-snug">
        {title}
      </h3>
      <ul className="flex flex-col gap-4">
        {bullets.map((b) => (
          <li key={b.metric} className="flex gap-3 items-baseline">
            <span className="font-mono text-[0.82rem] text-jgd-accent shrink-0 min-w-[5.5rem]">
              {b.metric}
            </span>
            <span className="text-[0.92rem] text-jgd-dim leading-[1.6]">
              {b.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MechanismBlock() {
  return (
    <section className="pt-[clamp(2rem,5vh,3rem)] pb-[clamp(3.5rem,10vh,6rem)] px-6 sm:px-10 border-t border-jgd-border">
      <div className="max-w-[1400px] mx-auto">
        <p className="text-[0.72rem] uppercase tracking-[4px] mb-5 text-jgd-accent">
          Under the hood
        </p>
        <h2 className="mb-3 font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-normal tracking-[-0.5px] leading-[1.2] text-jgd-text">
          Why an agent could call this 100 times a turn without noticing.
        </h2>
        <p className="text-[1.05rem] text-jgd-dim leading-[1.7] max-w-[680px] mb-12">
          Verification lives in the same process as the request handler. No
          network hop, no lock contention, no warm-up after a rebuild. The{" "}
          <span className="text-jgd-text font-medium">read path</span>  what
          every <code className="font-mono text-jgd-accent">/search</code>{" "}
          above hits  is lock-free and stays in microseconds even while the{" "}
          <span className="text-jgd-text font-medium">build path</span> is
          assembling the next nightly snapshot in scratch memory and
          atomically publishing it. Readers never see a half-built index,
          never wait on a writer. That&apos;s the whole reason the loop
          budget survives.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PathCard
            label="Read path"
            crate="hot-index"
            crateHref="https://github.com/nabinpkl/justgetdomain.com/tree/main/crates/hot-index"
            title="Lock-free, microsecond, never blocks on a writer."
            bullets={READ_PATH}
          />
          <PathCard
            label="Build path"
            crate="streaming-set-diff"
            crateHref="https://github.com/nabinpkl/justgetdomain.com/tree/main/crates/streaming-set-diff"
            title="Sort-aware diff, single-pass, atomic publish."
            bullets={BUILD_PATH}
          />
        </div>

        <p className="mt-8 text-[0.88rem] text-jgd-dim">
          Numbers are reproducible.{" "}
          <a
            href="https://github.com/nabinpkl/justgetdomain.com/blob/main/docs/PERFORMANCE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-jgd-accent underline-offset-4 hover:underline"
          >
            See docs/PERFORMANCE.md
          </a>{" "}
          for the criterion commands and the live /stats endpoint.
        </p>
      </div>
    </section>
  );
}

const REPO = "https://github.com/nabinpkl/justgetdomain.com";

type Section = {
  num: string;
  kicker: string;
  title: string;
  body: React.ReactNode;
  href: string;
  linkLabel: string;
};

const SECTIONS: Section[] = [
  {
    num: "01",
    kicker: "The problem",
    title: "Microsecond reads from a multi-gigabyte sorted source.",
    body: (
      <>
        A small candidate set fits in RAM. The source of truth (registered
        domains, breached password hashes, geo-IP ranges) sits sorted on disk
        and weighs gigabytes. You want, for each candidate, what the source
        says about it — at microsecond latency, from a single binary, rebuilt
        nightly with no downtime during the swap.
      </>
    ),
    href: `${REPO}#the-problem`,
    linkLabel: "Read the full thesis on GitHub",
  },
  {
    num: "02",
    kicker: "The two crates",
    title: "hot-index and streaming-set-diff.",
    body: (
      <>
        <code className="font-mono text-jgd-accent">hot-index</code> is the
        serving side: a <code className="font-mono">HotIndex&lt;K, V&gt;</code>{" "}
        trait, a default <code className="font-mono">FxHashIndex</code> impl,
        and a <code className="font-mono">HotSwap</code> wrapper around{" "}
        <code className="font-mono">arc-swap</code> for atomic publish.
        Persistence ships behind interchangeable{" "}
        <code className="font-mono">bincode</code> /{" "}
        <code className="font-mono">rkyv</code> feature flags.{" "}
        <code className="font-mono text-jgd-accent">streaming-set-diff</code>{" "}
        is the building side: a{" "}
        <code className="font-mono">LineParser</code> trait you implement
        once, and two algorithms with byte-identical output —{" "}
        <code className="font-mono">diff</code> (linear) and{" "}
        <code className="font-mono">diff_sorted</code> (binary search per
        candidate).
      </>
    ),
    href: `${REPO}/tree/main/crates`,
    linkLabel: "Browse the crates on GitHub",
  },
  {
    num: "03",
    kicker: "Performance",
    title: "Every claim pinned to a measured number.",
    body: (
      <>
        35 ns hit / 11 ns miss on{" "}
        <code className="font-mono">FxHashIndex</code> at 1M entries
        (criterion). 47 ns overhead per{" "}
        <code className="font-mono">HotSwap::load()</code>. 623 MiB/s for{" "}
        <code className="font-mono">diff_sorted</code> at 1M lines (5x the
        naive linear scan). 4 µs / 858 µs p50 / p99 whole-handler latency
        from the live{" "}
        <code className="font-mono">/stats</code> histogram. ~115 MiB resident
        for the production index. The doc names every gap it does not
        measure (10M-scale lookups, day-cycle memory, concurrent reader
        throughput under writer swap).
      </>
    ),
    href: `${REPO}/blob/main/docs/PERFORMANCE.md`,
    linkLabel: "Read docs/PERFORMANCE.md",
  },
  {
    num: "04",
    kicker: "Decisions",
    title: "ADR-style rationale for every non-obvious choice.",
    body: (
      <>
        Eight short ADRs. Why{" "}
        <code className="font-mono">FxHashSet</code> over{" "}
        <code className="font-mono">std::HashSet</code> (2x faster, gives up
        HashDoS resistance acceptable for trusted batch input). Why both{" "}
        <code className="font-mono">bincode</code> and{" "}
        <code className="font-mono">rkyv</code> (incompatible trait bounds,
        forcing one cuts off real consumers). Why no{" "}
        <code className="font-mono">/check/&#123;name&#125;</code> endpoint
        (recreates the GoDaddy UX this product was built to replace). Why
        atomic swap instead of RCU or per-key writes (the smallest unit of
        update is the whole snapshot).
      </>
    ),
    href: `${REPO}/blob/main/docs/DECISIONS.md`,
    linkLabel: "Read docs/DECISIONS.md",
  },
  {
    num: "05",
    kicker: "Limits",
    title: "Discovery, not recommendation.",
    body: (
      <>
        This engine returns <code className="font-mono">apple.xyz</code> if{" "}
        <code className="font-mono">apple.xyz</code> is unregistered. It has
        no opinion about whether you should register it. You should not.
        Trademark filtering is a different product — it needs USPTO/WIPO
        lookups, fuzzy matching, a reviewer queue, a brand-owner intake, and
        ongoing legal review. That is a recommender plus
        trust-and-safety pipeline, not an indexing problem. The unshipped
        pieces are deliberately unshipped, not unfinished.
      </>
    ),
    href: `${REPO}/blob/main/docs/LIMITS.md`,
    linkLabel: "Read docs/LIMITS.md",
  },
  {
    num: "06",
    kicker: "Other fits",
    title: "This is one example of N.",
    body: (
      <>
        The same two crates already power{" "}
        <code className="font-mono text-jgd-accent">
          breach-password-check
        </code>
        , a CLI that takes a sorted{" "}
        <a
          href="https://haveibeenpwned.com/Passwords"
          target="_blank"
          rel="noopener noreferrer"
          className="text-jgd-accent underline-offset-4 hover:underline"
        >
          HIBP-style
        </a>{" "}
        <code className="font-mono">HASH:COUNT</code> corpus and a list of
        candidate hashes, and reports which appear in breaches. Different
        file format, different value type, same{" "}
        <code className="font-mono">streaming-set-diff</code>. The shape
        generalizes to any candidate-against-large-sorted-corpus check —
        geo-IP lookups, ASN ownership, sanctions lists, allow/deny sets.
      </>
    ),
    href: `${REPO}/tree/main/examples/breach-password-check`,
    linkLabel: "See the breach-password-check example",
  },
];

function SectionCard({ s }: { s: Section }) {
  return (
    <article className="border-t border-jgd-border py-10 first:border-t-0 first:pt-0">
      <p className="text-[0.66rem] uppercase tracking-[3px] text-jgd-accent mb-2">
        <span className="text-jgd-muted mr-3 font-mono">{s.num}</span>
        {s.kicker}
      </p>
      <h3 className="font-serif text-[clamp(1.35rem,2.4vw,1.75rem)] font-normal tracking-[-0.3px] leading-[1.25] text-jgd-text mb-4 max-w-[640px]">
        {s.title}
      </h3>
      <div className="text-[0.95rem] text-jgd-dim leading-[1.75] max-w-[680px] mb-4">
        {s.body}
      </div>
      <a
        href={s.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-[0.82rem] text-jgd-accent underline-offset-4 hover:underline"
      >
        {s.linkLabel} →
      </a>
    </article>
  );
}

export function WriteupBlock() {
  return (
    <section className="px-6 sm:px-10 py-[clamp(3.5rem,8vh,5rem)] border-t border-jgd-border">
      <div className="max-w-[1400px] mx-auto">
        <p className="text-[0.72rem] uppercase tracking-[4px] mb-5 text-jgd-accent">
          What you&apos;re looking at
        </p>
        <h2 className="mb-12 font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-normal tracking-[-0.5px] leading-[1.2] text-jgd-text max-w-[640px]">
          A Rust workspace, two reusable crates, one live consumer.
        </h2>

        <div>
          {SECTIONS.map((s) => (
            <SectionCard key={s.num} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

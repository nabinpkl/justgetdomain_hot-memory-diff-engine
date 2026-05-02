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
    kicker: "The pattern",
    title: "A class of problems, not just a domain finder.",
    body: (
      <>
        You have a candidate set that fits in RAM (thousands to millions of
        keys). You have a multi-gigabyte sorted file with what each candidate
        maps to. You want microsecond lookups for any candidate, rebuilt
        nightly without downtime, on infrastructure you can afford. That&apos;s
        the shape this workspace solves. Domain availability is one
        instance. Password-breach checks are another. Geo-IP, sanctions,
        allow/deny lists, threat-intel feeds, license-key validation — all
        the same shape.
      </>
    ),
    href: REPO,
    linkLabel: "Read the workspace thesis",
  },
  {
    num: "02",
    kicker: "What it gives you",
    title: "Two reusable crates. Plug in your own corpus.",
    body: (
      <>
        <code className="font-mono text-jgd-accent">hot-index</code> holds
        your data in process memory and serves reads in tens of nanoseconds.
        <code className="font-mono text-jgd-accent"> streaming-set-diff</code>{" "}
        builds the index from your sorted file in a single pass. Both crates
        ship with the load-bearing invariants tested in unit tests, both
        compose without a database, both run on a free-tier VM. Bring your
        own <code className="font-mono">LineParser</code> for whatever
        format your source uses — colons, dots, fixed-width hashes,
        anything.
      </>
    ),
    href: `${REPO}/tree/main/crates`,
    linkLabel: "Browse the crates",
  },
  {
    num: "03",
    kicker: "Where else this fits",
    title: "Same engine, different file format.",
    body: (
      <>
        The repo ships{" "}
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
        <code className="font-mono">HASH:COUNT</code> corpus and reports
        which candidate hashes appear in breaches and how often. Same crates,
        different parser, ~80 LOC of glue. The same pattern fits anywhere
        you have a small candidate set against a huge sorted source —{" "}
        <span className="text-jgd-text">geo-IP</span> /{" "}
        <span className="text-jgd-text">ASN</span> ownership lookups,{" "}
        <span className="text-jgd-text">sanctions</span> screening,{" "}
        <span className="text-jgd-text">DNS RBLs</span>,{" "}
        <span className="text-jgd-text">threat-intel</span> feeds,{" "}
        <span className="text-jgd-text">license-key</span> validation,{" "}
        <span className="text-jgd-text">log-enrichment</span> pipelines. If
        your source can be sorted by key on disk, you can build a
        microsecond-latency lookup service for it on a single binary.
      </>
    ),
    href: `${REPO}/tree/main/examples/breach-password-check`,
    linkLabel: "See the breach-password-check example",
  },
  {
    num: "04",
    kicker: "What proves it",
    title: "Live numbers from this very page.",
    body: (
      <>
        Every search in the browser above hits the live{" "}
        <code className="font-mono">/stats</code> endpoint. p99 end-to-end
        latency, RSS, snapshot age — all measured on the running process,
        not in slides. Reproducible benches in{" "}
        <code className="font-mono">docs/PERFORMANCE.md</code>: 35 ns
        FxHashMap lookup, 47 ns HotSwap overhead, 623 MiB/s build throughput
        at 1M lines (5x the naive linear scan), ~115 MiB RSS for the
        7,500-entry × 1,012-TLD production index. The doc names the gaps it
        does <em>not</em> measure too — that&apos;s the part most perf docs
        skip.
      </>
    ),
    href: `${REPO}/blob/main/docs/PERFORMANCE.md`,
    linkLabel: "Read docs/PERFORMANCE.md",
  },
  {
    num: "05",
    kicker: "Why these choices",
    title: "Eight ADRs for the non-obvious calls.",
    body: (
      <>
        Why <code className="font-mono">FxHashSet</code> over{" "}
        <code className="font-mono">std::HashSet</code> (2x faster, gives up
        HashDoS resistance acceptable for trusted batch input). Why both{" "}
        <code className="font-mono">bincode</code> and{" "}
        <code className="font-mono">rkyv</code> as features (incompatible
        trait bounds, neither alone covers real callers). Why no{" "}
        <code className="font-mono">/check/&#123;name&#125;</code> endpoint
        (recreates the GoDaddy UX this product was built to replace). Why
        atomic snapshot swap, not RCU or per-key writes (the smallest unit
        of update is the whole snapshot).
      </>
    ),
    href: `${REPO}/blob/main/docs/DECISIONS.md`,
    linkLabel: "Read docs/DECISIONS.md",
  },
  {
    num: "06",
    kicker: "What it isn't",
    title: "Discovery, not recommendation.",
    body: (
      <>
        This engine returns <code className="font-mono">apple.xyz</code> if{" "}
        <code className="font-mono">apple.xyz</code> is unregistered. It has
        no opinion about whether you should register it. <strong>You should
        not.</strong> Trademark filtering is a different product with a
        different scope (USPTO/WIPO lookups, fuzzy matching, reviewer
        queues, brand-owner intake, recurring legal review). The unshipped
        pieces are deliberately unshipped, not unfinished.
      </>
    ),
    href: `${REPO}/blob/main/docs/LIMITS.md`,
    linkLabel: "Read docs/LIMITS.md",
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
        <h2 className="mb-4 font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-normal tracking-[-0.5px] leading-[1.2] text-jgd-text max-w-[720px]">
          A reusable engine, demonstrated through a domain finder.
        </h2>
        <p className="text-[1.05rem] text-jgd-dim leading-[1.7] max-w-[680px] mb-12">
          The browser above is one application of a more general capability:
          microsecond-latency lookups against a giant sorted source, on a
          single binary, with zero downtime during rebuilds. Below is what
          that capability is, where else it fits, and how to verify the
          claims.
        </p>

        <div>
          {SECTIONS.map((s) => (
            <SectionCard key={s.num} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

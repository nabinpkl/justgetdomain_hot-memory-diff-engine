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
    kicker: "The frustration",
    title: "Every “is this name taken” problem looks the same.",
    body: (
      <>
        You guess a name. Taken. You guess another. Taken. The same loop
        hits for startup names, packages, usernames, tickers, ENS handles,
        breached passwords, and every LLM that proposes ten candidates
        without knowing which exist.
        <br />
        <br />
        Small candidate set. Huge precomputed source. Real-time answer.
      </>
    ),
    href: REPO,
    linkLabel: "Read the workspace thesis",
  },
  {
    num: "02",
    kicker: "The agent angle",
    title: "Why it matters more in 2026 than in 2023.",
    body: (
      <>
        A chatbot suggesting all-taken names isn&apos;t a model problem.
        It&apos;s a missing tool problem.
        <br />
        <br />
        Give the agent a verification tool that answers in microseconds and
        it can call it on every candidate. Put the same tool behind a
        network hop and the agent either skips it (back to hallucinating)
        or pays a 10x per-turn latency tax (back to feeling slow).
        Verification has to live in the same address space as the loop.
      </>
    ),
    href: `${REPO}/tree/main/crates`,
    linkLabel: "Browse the crates",
  },
  {
    num: "03",
    kicker: "Beyond domains",
    title: "Same shape, different file.",
    body: (
      <>
        The repo ships{" "}
        <code className="font-mono text-jgd-accent">
          breach-password-check
        </code>
        : feed it a sorted{" "}
        <a
          href="https://haveibeenpwned.com/Passwords"
          target="_blank"
          rel="noopener noreferrer"
          className="text-jgd-accent underline-offset-4 hover:underline"
        >
          HIBP
        </a>{" "}
        <code className="font-mono">HASH:COUNT</code> corpus and it tells
        you which candidate hashes leaked. Same engine, different parser,
        ~80 LOC of glue.
        <br />
        <br />
        Same shape works for <span className="text-jgd-text">npm</span> /{" "}
        <span className="text-jgd-text">PyPI</span> /{" "}
        <span className="text-jgd-text">crates.io</span> name checks
        (registry dumps are public),{" "}
        <span className="text-jgd-text">ENS</span> handles,{" "}
        <span className="text-jgd-text">stock tickers</span>,{" "}
        <span className="text-jgd-text">geo-IP</span> /{" "}
        <span className="text-jgd-text">ASN</span>,{" "}
        <span className="text-jgd-text">sanctions</span>,{" "}
        <span className="text-jgd-text">DNS RBLs</span>,{" "}
        <span className="text-jgd-text">threat-intel</span>,{" "}
        <span className="text-jgd-text">license keys</span>,{" "}
        <span className="text-jgd-text">log enrichment</span>. Anything
        sortable by key.
      </>
    ),
    href: `${REPO}/tree/main/examples/breach-password-check`,
    linkLabel: "See the breach-password-check example",
  },
  {
    num: "04",
    kicker: "The boring why",
    title: "Why it actually feels instant.",
    body: (
      <>
        The numbers aren&apos;t the headline. They&apos;re why this fits on
        a $5 VM instead of needing a managed search service: 35 ns lookup,
        47 ns swap overhead, 4 µs / 858 µs p50 / p99 end-to-end, ~115 MiB
        RSS, 623 MiB/s build throughput.
        <br />
        <br />
        The doc also names the gaps it doesn&apos;t measure.
      </>
    ),
    href: `${REPO}/blob/main/docs/PERFORMANCE.md`,
    linkLabel: "Read docs/PERFORMANCE.md",
  },
  {
    num: "05",
    kicker: "Decisions, not cleverness",
    title: "Eight non-obvious calls, written down.",
    body: (
      <>
        Why <code className="font-mono">FxHashSet</code> over{" "}
        <code className="font-mono">std::HashSet</code> (2x faster,
        HashDoS-acceptable for trusted batch input). Why both{" "}
        <code className="font-mono">bincode</code> and{" "}
        <code className="font-mono">rkyv</code> as features (incompatible
        trait bounds). Why no{" "}
        <code className="font-mono">/check/&#123;name&#125;</code> endpoint
        (recreates the one-at-a-time loop this was built to remove). Why
        atomic snapshot swap (the smallest unit of update is the whole
        snapshot).
      </>
    ),
    href: `${REPO}/blob/main/docs/DECISIONS.md`,
    linkLabel: "Read docs/DECISIONS.md",
  },
  {
    num: "06",
    kicker: "Honest scope",
    title: "What this isn’t.",
    body: (
      <>
        Returns <code className="font-mono">apple.xyz</code> if{" "}
        <code className="font-mono">apple.xyz</code> is unregistered. Has
        no opinion on whether you should register it. <strong>You should
        not.</strong> Trademark filtering, brand-collision checks,
        business-existence verification, semantic typosquat detection: all
        different products, different scopes. They belong on top of this
        engine, not inside it.
      </>
    ),
    href: `${REPO}/blob/main/docs/LIMITS.md`,
    linkLabel: "Read docs/LIMITS.md",
  },
];

function SectionCard({ s }: { s: Section }) {
  return (
    <article className="border-t border-jgd-border py-10 first:border-t-0 first:pt-0 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-x-14 gap-y-3">
      <p className="text-[0.66rem] uppercase tracking-[3px] text-jgd-accent lg:pt-1">
        <span className="text-jgd-muted mr-3 font-mono">{s.num}</span>
        {s.kicker}
      </p>
      <div className="max-w-[720px]">
        <h3 className="font-serif text-[clamp(1.35rem,2.4vw,1.75rem)] font-normal tracking-[-0.3px] leading-[1.25] text-jgd-text mb-4">
          {s.title}
        </h3>
        <div className="text-[0.95rem] text-jgd-dim leading-[1.75] mb-4">
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
      </div>
    </article>
  );
}

export function WriteupBlock() {
  return (
    <section className="px-6 sm:px-10 py-[clamp(3.5rem,8vh,5rem)] border-t border-jgd-border">
      <div className="max-w-[1180px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-x-14 gap-y-4 mb-14">
          <p className="text-[0.72rem] uppercase tracking-[4px] text-jgd-accent lg:pt-2">
            What you&apos;re looking at
          </p>
          <div className="max-w-[720px]">
            <h2 className="mb-4 font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-normal tracking-[-0.5px] leading-[1.2] text-jgd-text">
              One frustration. A class of solutions.
            </h2>
            <p className="text-[1.05rem] text-jgd-dim leading-[1.7]">
              A tiny in-process verification tool that an agent or a human
              can call freely, without waiting. Built for domains. The same
              shape applies to anything you can pre-list.
            </p>
          </div>
        </div>

        <div>
          {SECTIONS.map((s) => (
            <SectionCard key={s.num} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

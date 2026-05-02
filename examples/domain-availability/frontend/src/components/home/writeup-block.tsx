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
    title: "Every “is this name taken” problem feels the same.",
    body: (
      <>
        You want a domain. You guess one. Taken. You guess again. Taken. You
        give up at six. The same loop hits when you name a startup, a
        package, a username, a stock ticker, an ENS handle. Same loop hits
        when a developer checks if a password leaked in a breach. Same loop
        hits when an LLM proposes ten candidates and you have to figure out
        which ones are even worth showing the user.
        <br />
        <br />
        The shape is always the same: a small set of things you&apos;re
        considering, a giant precomputed source of what&apos;s already taken
        or known, and you want to know in real time which side each
        candidate is on.
      </>
    ),
    href: REPO,
    linkLabel: "Read the workspace thesis",
  },
  {
    num: "02",
    kicker: "The agent angle",
    title: "Why this kind of tool matters more in 2026 than it did in 2023.",
    body: (
      <>
        A chatbot suggesting startup names that are all registered isn&apos;t
        a chatbot problem. It&apos;s a missing tool problem. The model has
        no way to know.
        <br />
        <br />
        Give the agent a verification tool that answers in microseconds and
        it can call it on every single candidate it generates. Make that
        tool a network hop and the agent either skips it (back to
        hallucinating taken names) or pays a 10x latency tax per turn (back
        to feeling slow). The verification step has to live in the same
        address space as the loop. That&apos;s the constraint this workspace
        is shaped around.
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
        which candidate hashes appear in breaches and how often. Same
        engine, different parser, ~80 LOC of glue.
        <br />
        <br />
        Anywhere a small candidate set meets a huge sorted source the same
        tool shape applies: <span className="text-jgd-text">npm</span> /{" "}
        <span className="text-jgd-text">PyPI</span> /{" "}
        <span className="text-jgd-text">crates.io</span> name lookups
        (registry dumps are public), <span className="text-jgd-text">ENS</span>{" "}
        handle availability,{" "}
        <span className="text-jgd-text">stock ticker</span> existence,{" "}
        <span className="text-jgd-text">geo-IP</span> /{" "}
        <span className="text-jgd-text">ASN</span> ownership,{" "}
        <span className="text-jgd-text">sanctions</span> screening,{" "}
        <span className="text-jgd-text">DNS RBLs</span>,{" "}
        <span className="text-jgd-text">threat-intel</span> feeds,{" "}
        <span className="text-jgd-text">license-key</span> validation,{" "}
        <span className="text-jgd-text">log enrichment</span>. If the source
        can be sorted on a key, you can build a tool an agent (or a human)
        can call without ever waiting on it.
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
        The numbers below are real and reproducible, but they&apos;re not
        the headline. They&apos;re the reason this tool shape works on a $5
        VM instead of needing a managed search service: 35 ns FxHashMap
        lookup, 47 ns HotSwap overhead, 4 µs / 858 µs p50 / p99 end-to-end
        on the live <code className="font-mono">/stats</code> endpoint, ~115
        MiB RSS for the production index, 623 MiB/s build throughput.
        <br />
        <br />
        The doc names the gaps it does <em>not</em> measure too. That&apos;s
        the part most perf docs skip.
      </>
    ),
    href: `${REPO}/blob/main/docs/PERFORMANCE.md`,
    linkLabel: "Read docs/PERFORMANCE.md",
  },
  {
    num: "05",
    kicker: "Decisions, not cleverness",
    title: "Eight calls written down so future-me doesn’t relitigate them.",
    body: (
      <>
        Why <code className="font-mono">FxHashSet</code> over{" "}
        <code className="font-mono">std::HashSet</code> (2x faster, gives up
        HashDoS resistance acceptable for trusted batch input). Why both{" "}
        <code className="font-mono">bincode</code> and{" "}
        <code className="font-mono">rkyv</code> as features (incompatible
        trait bounds, neither alone covers real callers). Why no{" "}
        <code className="font-mono">/check/&#123;name&#125;</code> endpoint
        (recreates the one-at-a-time guessing loop this whole thing was
        built to remove). Why atomic snapshot swap, not RCU or per-key
        writes (the smallest unit of update is the whole snapshot).
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
        This engine returns <code className="font-mono">apple.xyz</code> if{" "}
        <code className="font-mono">apple.xyz</code> is unregistered. It has
        no opinion about whether you should register it. <strong>You should
        not.</strong> Trademark filtering, brand-collision checks,
        business-existence verification, semantic typosquat detection 
        those are different products with different scopes. They belong{" "}
        <em>on top of</em> this engine, not inside it. The unshipped pieces
        are deliberately unshipped, not unfinished.
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
              Built to fix one frustration. Turned out to fix a class of them.
            </h2>
            <p className="text-[1.05rem] text-jgd-dim leading-[1.7]">
              The browser above came from getting tired of guessing domain
              names that turn out to be taken. The shape of the fix  a
              tiny in-process verification tool that an agent or a human
              can call freely without waiting  turns out to apply far past
              domains. Below is what that tool is, where else it fits, and
              why it matters more in the LLM era than it would have a few
              years ago.
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

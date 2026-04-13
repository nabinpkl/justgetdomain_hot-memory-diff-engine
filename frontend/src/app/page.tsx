import Link from "next/link";
import { TerminalDemo } from "@/components/terminal-demo";
import { WaitlistForm } from "@/components/waitlist-form";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "JustGetDomain",
  url: "https://justgetdomain.com",
  description:
    "Recursively discovers every available short domain name so you don't have to search one by one. Browse 3, 4, and 5-letter domains that are actually available.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
  },
};

const STEPS = [
  {
    depth: "3",
    title: "Three-letter sweep",
    desc: "Every 3-letter combination across major TLDs. The rarest, most premium namespace — we surface every available one.",
  },
  {
    depth: "4",
    title: "Four-letter expansion",
    desc: "The sweet spot for brandable names. Dictionary words, abbreviations, pronounceable combos — filtered to only what's open.",
  },
  {
    depth: "5",
    title: "Five-letter deep scan",
    desc: "Real words, compound fragments, memorable slugs. The widest net, still filtered down to zero noise — every result is registrable.",
  },
];

const FEATURES = [
  {
    num: "01",
    title: "Pre-checked",
    desc: 'Every domain you see has been verified available. No "taken" results, ever. That\'s the whole point.',
  },
  {
    num: "02",
    title: "No front-running",
    desc: "We don't register, hold, or broker names. We index availability. Your searches stay private and stateless.",
  },
  {
    num: "03",
    title: "Exhaustive",
    desc: 'Not a sample, not "top picks." The full list of available domains at each length. Browse all of it.',
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div
        className="overflow-x-hidden"
        style={{
          background: "var(--jgd-bg)",
          color: "var(--jgd-text)",
          fontFamily: "var(--font-mono), monospace",
          lineHeight: "1.7",
        }}
      >
        {/* ── Topbar ── */}
        <nav
          role="navigation"
          aria-label="Main"
          className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-4 text-[0.7rem] tracking-[1.5px] uppercase backdrop-blur-[16px]"
          style={{
            background: "oklch(0.02 0 0 / 0.85)",
            borderBottom: "1px solid var(--jgd-border)",
          }}
        >
          <span style={{ color: "var(--jgd-accent)", fontWeight: 700 }}>
            JustGetDomain
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/search"
              className="transition-colors hover:text-jgd-accent"
              style={{
                color: "var(--jgd-dim)",
                fontSize: "0.7rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase" as const,
              }}
            >
              Browse Domains
            </Link>
            <span className="flex items-center gap-2" style={{ color: "var(--jgd-dim)" }}>
              <span
                className="jgd-pulse inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--jgd-accent)" }}
              />
              Launching Soon
            </span>
          </div>
        </nav>

        {/* ── Hero ── */}
        <header
          id="home"
          className="min-h-screen flex flex-col justify-center items-center text-center relative"
          style={{ paddingTop: "60px" }}
        >
          {/* ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 600px 400px at 50% 40%, oklch(0.87 0.29 142 / 0.04), transparent),
                radial-gradient(ellipse 300px 300px at 70% 60%, oklch(0.87 0.29 142 / 0.02), transparent)
              `,
            }}
          />

          <div className="relative w-full max-w-[820px] mx-auto px-6 flex flex-col items-center">
            <h1
              className="jgd-fade-up leading-none mb-3"
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(3rem, 10vw, 6.5rem)",
                fontWeight: 400,
                letterSpacing: "-3px",
              }}
            >
              JustGet
              <br />
              Domain
              <span style={{ color: "var(--jgd-accent)" }}>.</span>
            </h1>

            <p
              className="jgd-fade-up text-[0.72rem] uppercase tracking-[6px] mb-12 [animation-delay:0.15s]"
              style={{ color: "var(--jgd-dim)" }}
            >
              Every available short domain. Already found.
            </p>

            <p
              className="jgd-fade-up max-w-[540px] text-[0.88rem] [animation-delay:0.3s]"
              style={{ color: "var(--jgd-dim)", lineHeight: "1.9" }}
            >
              We don&apos;t wait for you to search. We&apos;ve already checked every 3,
              4, and 5-letter domain and filtered out the taken ones.{" "}
              <strong style={{ color: "var(--jgd-text)", fontWeight: 400 }}>
                You only see what you can actually register.
              </strong>
            </p>

            <div className="jgd-fade-up w-full flex justify-center [animation-delay:0.45s]">
              <TerminalDemo />
            </div>

            <p
              className="jgd-fade-up text-[0.65rem] text-center [animation-delay:0.6s]"
              style={{ color: "var(--jgd-dim)", opacity: 0.5, maxWidth: "480px", lineHeight: "1.7" }}
            >
              Availability does not guarantee the right to use a name. Users are responsible for ensuring their domain does not infringe on existing trademarks.
            </p>
          </div>
        </header>

        {/* ── The Problem ── */}
        <section
          id="problem"
          style={{ padding: "120px 0", borderTop: "1px solid var(--jgd-border)" }}
        >
          <div className="max-w-[820px] mx-auto px-6">
            <p
              className="text-[0.65rem] uppercase tracking-[4px] mb-6"
              style={{ color: "var(--jgd-dim)" }}
            >
              The problem
            </p>
            <h2
              className="mb-8"
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 400,
                letterSpacing: "-1px",
                lineHeight: "1.2",
              }}
            >
              You shouldn&apos;t have to
              <br />
              guess domain names
            </h2>

            <p className="text-[0.88rem] max-w-[600px]" style={{ color: "var(--jgd-dim)", lineHeight: "1.9" }}>
              The current workflow is broken. You think of a name, type it into a
              registrar, see &quot;taken,&quot; think of another, see &quot;taken&quot; again, repeat
              forty times, settle for something you don&apos;t love, or give up entirely.
              Chatbots aren&apos;t better — they&apos;ll happily suggest names that have been
              registered since 2004.
            </p>
            <p
              className="text-[0.88rem] max-w-[600px] mt-5"
              style={{ color: "var(--jgd-dim)", lineHeight: "1.9" }}
            >
              <strong style={{ color: "var(--jgd-text)", fontWeight: 400 }}>
                JustGetDomain inverts the process.
              </strong>{" "}
              Instead of you guessing and us checking, we check everything first and
              hand you the results. Every available short domain, pre-verified,
              browsable.
            </p>

            {/* audience grid */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-px mt-14"
              style={{
                background: "var(--jgd-border)",
                border: "1px solid var(--jgd-border)",
              }}
            >
              {[
                {
                  label: "Audience 01",
                  title: "\u201cI know what I want\u201d",
                  desc: "You have a name in mind but it\u2019s taken. You need close variations \u2014 different lengths, real words, alternate TLDs \u2014 that are actually available right now. No more guessing.",
                },
                {
                  label: "Audience 02",
                  title: "\u201cJust show me what\u2019s open\u201d",
                  desc: "You\u2019re tired of the search-reject-repeat loop. You want to browse available domains like a catalog and pick one that clicks. We give you the exhaustive list \u2014 only available names, nothing taken.",
                },
              ].map((a) => (
                <div key={a.label} style={{ background: "var(--jgd-bg)", padding: "36px 28px" }}>
                  <p
                    className="text-[0.6rem] uppercase tracking-[3px] mb-4"
                    style={{ color: "var(--jgd-accent)" }}
                  >
                    {a.label}
                  </p>
                  <h3
                    className="mb-3"
                    style={{
                      fontFamily: "var(--font-serif), Georgia, serif",
                      fontSize: "1.3rem",
                      fontWeight: 400,
                    }}
                  >
                    {a.title}
                  </h3>
                  <p className="text-[0.78rem]" style={{ color: "var(--jgd-dim)", lineHeight: "1.8" }}>
                    {a.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section
          id="how"
          style={{ padding: "120px 0", borderTop: "1px solid var(--jgd-border)" }}
        >
          <div className="max-w-[820px] mx-auto px-6">
            <p
              className="text-[0.65rem] uppercase tracking-[4px] mb-6"
              style={{ color: "var(--jgd-dim)" }}
            >
              How it works
            </p>
            <h2
              className="mb-8"
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 400,
                letterSpacing: "-1px",
                lineHeight: "1.2",
              }}
            >
              Senseful discovery,
              <br />
              not blind search
            </h2>
            <p className="text-[0.88rem] max-w-[600px]" style={{ color: "var(--jgd-dim)", lineHeight: "1.9" }}>
              We start at short letters and work outward. Every combination gets
              checked. Taken names get discarded. What&apos;s left is yours to browse
              — an exhaustive, living index of domains that are actually available
              to register.
            </p>

            {/* steps */}
            <div className="mt-14 flex flex-col">
              {STEPS.map((step, i) => (
                <div
                  key={step.depth}
                  className="grid"
                  style={{
                    gridTemplateColumns: "80px 1fr",
                    borderTop: "1px solid var(--jgd-border)",
                    borderBottom: i === STEPS.length - 1 ? "1px solid var(--jgd-border)" : undefined,
                    padding: "28px 0",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif), Georgia, serif",
                      fontSize: "2rem",
                      color: "var(--jgd-accent)",
                      opacity: 0.7,
                    }}
                  >
                    {step.depth}
                  </span>
                  <div>
                    <h3 className="text-[0.9rem] font-bold tracking-[0.5px] mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-[0.78rem]" style={{ color: "var(--jgd-dim)", lineHeight: "1.7" }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The Approach ── */}
        <section
          id="strategy"
          style={{ padding: "120px 0", borderTop: "1px solid var(--jgd-border)" }}
        >
          <div className="max-w-[820px] mx-auto px-6">
            <p
              className="text-[0.65rem] uppercase tracking-[4px] mb-6"
              style={{ color: "var(--jgd-dim)" }}
            >
              The approach
            </p>

            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-14"
              style={{
                background: "var(--jgd-border)",
                border: "1px solid var(--jgd-border)",
              }}
            >
              {FEATURES.map((f) => (
                <article key={f.num} style={{ background: "var(--jgd-bg)", padding: "32px 24px" }}>
                  <p
                    className="text-[0.6rem] tracking-[2px] mb-3"
                    style={{ color: "var(--jgd-accent)" }}
                  >
                    {f.num}
                  </p>
                  <h3
                    className="mb-2.5"
                    style={{
                      fontFamily: "var(--font-serif), Georgia, serif",
                      fontSize: "1.15rem",
                      fontWeight: 400,
                    }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-[0.78rem]" style={{ color: "var(--jgd-dim)", lineHeight: "1.7" }}>
                    {f.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          id="waitlist"
          className="text-center relative"
          style={{ padding: "140px 0", borderTop: "1px solid var(--jgd-border)" }}
        >
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: "400px",
              height: "400px",
              background: "radial-gradient(circle, oklch(0.87 0.29 142 / 0.03), transparent 70%)",
            }}
          />
          <div className="relative max-w-[820px] mx-auto px-6">
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 400,
                letterSpacing: "-1px",
                lineHeight: "1.2",
              }}
            >
              Get early access
            </h2>
            <p
              className="text-[0.88rem] mx-auto mb-10 text-center"
              style={{ color: "var(--jgd-dim)", maxWidth: "600px", lineHeight: "1.9" }}
            >
              We&apos;ll let you know when the index goes live. No spam.
            </p>
            <WaitlistForm />
          </div>
        </section>

        {/* ── LinkedIn ── */}
        <div
          className="text-center py-4 text-[0.78rem]"
          style={{ color: "var(--jgd-dim)" }}
        >
          Connect with me on LinkedIn:{" "}
          <a
            href="https://linkedin.com/in/nabin-pokhrel"
            style={{ color: "var(--jgd-accent)" }}
          >
            Nabin Pokhrel
          </a>
        </div>

        {/* ── Footer ── */}
        <footer
          className="text-center text-[0.65rem] uppercase tracking-[2px]"
          style={{
            padding: "40px 0",
            color: "oklch(0.50 0 0)",
            borderTop: "1px solid var(--jgd-border)",
          }}
        >
          &copy; 2026 JustGetDomain
        </footer>
      </div>
    </>
  );
}

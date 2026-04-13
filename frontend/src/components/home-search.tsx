"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalDemo } from "@/components/terminal-demo";
import { WaitlistForm } from "@/components/waitlist-form";

// ─── Types & mock data (same as domain-search) ────────────────────────
type DomainEntry = {
  name: string;
  tlds: string[];
  length: number;
};

const MOCK_DOMAINS: DomainEntry[] = [
  { name: "flux", tlds: [".dev", ".sh", ".xyz"], length: 4 },
  { name: "grit", tlds: [".sh", ".io", ".xyz"], length: 4 },
  { name: "plow", tlds: [".io", ".dev"], length: 4 },
  { name: "gleam", tlds: [".dev", ".app", ".sh"], length: 5 },
  { name: "stoic", tlds: [".sh", ".xyz", ".io"], length: 5 },
  { name: "bxq", tlds: [".com", ".dev", ".io", ".app"], length: 3 },
  { name: "fwj", tlds: [".com", ".net", ".xyz"], length: 3 },
  { name: "vex", tlds: [".dev", ".io"], length: 3 },
  { name: "elm", tlds: [".sh", ".app"], length: 3 },
  { name: "crisp", tlds: [".dev", ".sh", ".xyz", ".io"], length: 5 },
  { name: "bloom", tlds: [".sh", ".xyz"], length: 5 },
  { name: "drift", tlds: [".dev", ".io", ".app"], length: 5 },
  { name: "spark", tlds: [".sh", ".xyz", ".io", ".app"], length: 5 },
  { name: "plume", tlds: [".dev", ".sh"], length: 5 },
  { name: "oxide", tlds: [".dev", ".sh", ".io"], length: 5 },
  { name: "zest", tlds: [".dev", ".io", ".sh", ".app"], length: 4 },
  { name: "wick", tlds: [".dev", ".sh"], length: 4 },
  { name: "dusk", tlds: [".io", ".xyz", ".app"], length: 4 },
  { name: "knot", tlds: [".dev", ".sh", ".io"], length: 4 },
  { name: "palm", tlds: [".sh", ".xyz"], length: 4 },
  { name: "cove", tlds: [".dev", ".io", ".app", ".sh"], length: 4 },
  { name: "reef", tlds: [".dev", ".sh", ".xyz"], length: 4 },
  { name: "bolt", tlds: [".sh", ".io"], length: 4 },
  { name: "mist", tlds: [".dev", ".xyz", ".io"], length: 4 },
  { name: "rune", tlds: [".dev", ".sh", ".app"], length: 4 },
  { name: "vale", tlds: [".dev", ".io"], length: 4 },
  { name: "pyre", tlds: [".sh", ".xyz"], length: 4 },
  { name: "haze", tlds: [".dev", ".io", ".app"], length: 4 },
  { name: "nyx", tlds: [".dev", ".io", ".sh", ".com"], length: 3 },
  { name: "orb", tlds: [".dev", ".sh"], length: 3 },
  { name: "zyl", tlds: [".com", ".io", ".dev"], length: 3 },
  { name: "kvo", tlds: [".dev", ".sh", ".xyz"], length: 3 },
  { name: "wren", tlds: [".dev", ".io", ".sh", ".app", ".xyz"], length: 4 },
  { name: "sage", tlds: [".dev", ".sh"], length: 4 },
  { name: "fern", tlds: [".dev", ".io", ".xyz"], length: 4 },
  { name: "loom", tlds: [".sh", ".dev", ".io"], length: 4 },
  { name: "quill", tlds: [".dev", ".sh", ".io"], length: 5 },
  { name: "forge", tlds: [".dev", ".sh", ".app"], length: 5 },
  { name: "slate", tlds: [".dev", ".io", ".xyz", ".sh"], length: 5 },
  { name: "thorn", tlds: [".dev", ".sh"], length: 5 },
  { name: "briar", tlds: [".dev", ".io", ".sh"], length: 5 },
  { name: "flint", tlds: [".dev", ".sh", ".xyz", ".app"], length: 5 },
  { name: "ember", tlds: [".dev", ".io"], length: 5 },
  { name: "fjord", tlds: [".dev", ".sh", ".io", ".app"], length: 5 },
  { name: "prism", tlds: [".dev", ".io", ".sh"], length: 5 },
  { name: "tidal", tlds: [".dev", ".sh", ".xyz"], length: 5 },
];

const REGISTRARS = [
  { name: "Namecheap", url: "https://www.namecheap.com/domains/registration/results/?domain=" },
  { name: "Porkbun", url: "https://porkbun.com/checkout/search?q=" },
  { name: "Cloudflare", url: "https://www.cloudflare.com/products/registrar/" },
];

const STEPS = [
  {
    depth: "3",
    title: "Three-letter sweep",
    desc: "Every 3-letter combination across major TLDs. The rarest, most premium namespace \u2014 we surface every available one.",
  },
  {
    depth: "4",
    title: "Four-letter expansion",
    desc: "The sweet spot for brandable names. Dictionary words, abbreviations, pronounceable combos \u2014 filtered to only what\u2019s open.",
  },
  {
    depth: "5",
    title: "Five-letter deep scan",
    desc: "Real words, compound fragments, memorable slugs. The widest net, still filtered down to zero noise \u2014 every result is registrable.",
  },
];

const FEATURES = [
  {
    num: "01",
    title: "Pre-checked",
    desc: "Every domain you see has been verified available. No \u201ctaken\u201d results, ever. That\u2019s the whole point.",
  },
  {
    num: "02",
    title: "No front-running",
    desc: "We don\u2019t register, hold, or broker names. We index availability. Your searches stay private and stateless.",
  },
  {
    num: "03",
    title: "Exhaustive",
    desc: "Not a sample, not \u201ctop picks.\u201d The full list of available domains at each length. Browse all of it.",
  },
];

// ─── Main Component ────────────────────────────────────────────────────

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    setExpandedDomain(null);
  }, [query]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return MOCK_DOMAINS.filter((d) => d.name.includes(q));
  }, [query]);

  return (
    <div className="overflow-x-hidden min-h-screen bg-jgd-bg text-jgd-text font-sans font-medium leading-[1.7]">
      {/* ── Nav ── */}
      <nav
        role="navigation"
        aria-label="Main"
        className="fixed top-0 inset-x-0 z-50 flex justify-between items-center px-8 py-4 text-[0.75rem] tracking-[1.5px] uppercase backdrop-blur-[16px] bg-[oklch(0.16_0_0/0.92)] border-b border-jgd-border"
      >
        <span className="text-jgd-accent font-bold">JustGetDomain</span>
        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="text-jgd-dim text-[0.75rem] tracking-[1.5px] uppercase transition-colors hover:text-jgd-accent"
          >
            Browse Domains
          </Link>
          <span className="flex items-center gap-2 text-jgd-dim">
            <span className="jgd-pulse inline-block w-1.5 h-1.5 rounded-full bg-jgd-accent" />
            Launching Soon
          </span>
        </div>
      </nav>

      {/* ── Hero / Search ── */}
      <div
        className={cn(
          "relative flex flex-col pt-[57px] transition-[min-height] duration-700 jgd-ease-out",
          isSearching ? "min-h-0" : "min-h-screen"
        )}
      >
        {/* Ambient glow */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-500",
            isSearching ? "opacity-0" : "opacity-100"
          )}
          style={{
            background: `
              radial-gradient(ellipse 600px 400px at 50% 40%, oklch(0.75 0.18 142 / 0.04), transparent),
              radial-gradient(ellipse 300px 300px at 70% 60%, oklch(0.75 0.18 142 / 0.02), transparent)
            `,
          }}
        />

        {/* Top spacer — pushes content to center */}
        <div
          className={cn(
            "transition-[flex-grow] duration-700 jgd-ease-out",
            isSearching ? "grow-0" : "grow"
          )}
        />

        {/* Title block — collapses when searching */}
        <div
          className={cn(
            "relative flex flex-col items-center text-center px-6 overflow-hidden transition-all duration-500 jgd-ease-out",
            isSearching
              ? "max-h-0 opacity-0 mb-0"
              : "max-h-[400px] opacity-100 mb-12"
          )}
        >
          <h1 className="leading-none mb-3 font-serif text-[clamp(3rem,10vw,6.5rem)] font-normal tracking-[-3px]">
            JustGet
            <br />
            Domain
            <span className="text-jgd-accent">.</span>
          </h1>
          <p className="text-[0.78rem] uppercase tracking-[6px] text-jgd-dim">
            Every available short domain. Already found.
          </p>
        </div>

        {/* ── Search bar — sticky when searching ── */}
        <div
          className={cn(
            "relative sticky top-[57px] z-40 w-full transition-all duration-500 jgd-ease-out",
            isSearching
              ? "bg-[oklch(0.16_0_0/0.92)] backdrop-blur-[20px] border-b border-b-jgd-border px-6 py-4"
              : "bg-transparent backdrop-blur-none border-b border-b-transparent px-6 py-0"
          )}
        >
          <div
            className={cn(
              "mx-auto transition-[max-width] duration-500",
              isSearching ? "max-w-[800px]" : "max-w-[640px]"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3 cursor-text bg-jgd-surface rounded-lg transition-all duration-300",
                isSearching
                  ? "border border-jgd-border px-4 py-3"
                  : "border border-jgd-accent/15 px-6 py-[18px]"
              )}
              onClick={() => inputRef.current?.focus()}
            >
              <Search
                size={isSearching ? 16 : 20}
                className="text-jgd-dim shrink-0 transition-[width,height] duration-300"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search available domains..."
                className={cn(
                  "flex-1 bg-transparent outline-none placeholder:opacity-50 text-jgd-text font-sans caret-jgd-accent transition-[font-size] duration-300",
                  isSearching ? "text-[0.88rem]" : "text-[1.1rem]"
                )}
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-jgd-dim hover:text-jgd-text transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Result count */}
            {isSearching && (
              <div className="flex items-center gap-4 mt-3 text-[0.72rem] uppercase tracking-[2px] text-jgd-dim">
                <span>
                  {results.length} domain{results.length !== 1 ? "s" : ""}{" "}
                  found
                </span>
                <span className="text-[oklch(0.45_0_0)]">/</span>
                <span>Updated 4h ago</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom spacer — for centering in hero mode */}
        <div
          className={cn(
            "transition-[flex-grow] duration-700 jgd-ease-out",
            isSearching ? "grow-0" : "grow"
          )}
        />
      </div>

      {/* ── Results ── */}
      {isSearching && (
        <div className="px-5 pt-6 pb-20">
          <div className="max-w-[1200px] mx-auto">
            {results.length === 0 ? (
              <EmptyState
                query={query}
                onClear={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                {results.map((domain, i) => (
                  <DomainTile
                    key={domain.name}
                    domain={domain}
                    index={i}
                    isExpanded={expandedDomain === domain.name}
                    onToggle={() =>
                      setExpandedDomain(
                        expandedDomain === domain.name ? null : domain.name
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Landing sections (visible when not searching) ── */}
      {!isSearching && (
        <>
          {/* Terminal demo */}
          <div className="jgd-fade-up flex justify-center px-6 pb-8 -mt-[120px] [animation-delay:0.45s]">
            <TerminalDemo />
          </div>

          <p className="jgd-fade-up text-[0.72rem] text-center px-6 pb-16 [animation-delay:0.6s] text-jgd-dim max-w-[480px] leading-[1.7] mx-auto">
            Availability does not guarantee the right to use a name. Users are
            responsible for ensuring their domain does not infringe on existing
            trademarks.
          </p>

          {/* ── The Problem ── */}
          <section className="py-[120px] border-t border-jgd-border">
            <div className="max-w-[820px] mx-auto px-6">
              <p className="text-[0.72rem] uppercase tracking-[4px] mb-6 text-jgd-dim">
                The problem
              </p>
              <h2 className="mb-8 font-serif text-[clamp(1.8rem,4vw,2.8rem)] font-normal tracking-[-1px] leading-[1.2]">
                You shouldn&apos;t have to
                <br />
                guess domain names
              </h2>
              <p className="text-[0.88rem] max-w-[600px] text-jgd-dim leading-[1.9]">
                The current workflow is broken. You think of a name, type it
                into a registrar, see &quot;taken,&quot; think of another, see
                &quot;taken&quot; again, repeat forty times, settle for something
                you don&apos;t love, or give up entirely. Chatbots aren&apos;t
                better &mdash; they&apos;ll happily suggest names that have been
                registered since 2004.
              </p>
              <p className="text-[0.88rem] max-w-[600px] mt-5 text-jgd-dim leading-[1.9]">
                <strong className="text-jgd-text font-normal">
                  JustGetDomain inverts the process.
                </strong>{" "}
                Instead of you guessing and us checking, we check everything
                first and hand you the results. Every available short domain,
                pre-verified, browsable.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mt-14 bg-jgd-border border border-jgd-border">
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
                  <div key={a.label} className="bg-jgd-bg px-7 py-9">
                    <p className="text-[0.7rem] uppercase tracking-[3px] mb-4 text-jgd-accent">
                      {a.label}
                    </p>
                    <h3 className="mb-3 font-serif text-[1.3rem] font-normal">
                      {a.title}
                    </h3>
                    <p className="text-[0.84rem] text-jgd-dim leading-[1.8]">
                      {a.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How it works ── */}
          <section className="py-[120px] border-t border-jgd-border">
            <div className="max-w-[820px] mx-auto px-6">
              <p className="text-[0.72rem] uppercase tracking-[4px] mb-6 text-jgd-dim">
                How it works
              </p>
              <h2 className="mb-8 font-serif text-[clamp(1.8rem,4vw,2.8rem)] font-normal tracking-[-1px] leading-[1.2]">
                Senseful discovery,
                <br />
                not blind search
              </h2>
              <p className="text-[0.88rem] max-w-[600px] text-jgd-dim leading-[1.9]">
                We start at short letters and work outward. Every combination
                gets checked. Taken names get discarded. What&apos;s left is
                yours to browse &mdash; an exhaustive, living index of domains
                that are actually available to register.
              </p>

              <div className="mt-14 flex flex-col">
                {STEPS.map((step, i) => (
                  <div
                    key={step.depth}
                    className={cn(
                      "grid grid-cols-[80px_1fr] border-t border-jgd-border py-7",
                      i === STEPS.length - 1 && "border-b"
                    )}
                  >
                    <span className="font-serif text-[2rem] text-jgd-accent opacity-70">
                      {step.depth}
                    </span>
                    <div>
                      <h3 className="text-[0.9rem] font-bold tracking-[0.5px] mb-1.5">
                        {step.title}
                      </h3>
                      <p className="text-[0.84rem] text-jgd-dim leading-[1.7]">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── The Approach ── */}
          <section className="py-[120px] border-t border-jgd-border">
            <div className="max-w-[820px] mx-auto px-6">
              <p className="text-[0.72rem] uppercase tracking-[4px] mb-6 text-jgd-dim">
                The approach
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-14 bg-jgd-border border border-jgd-border">
                {FEATURES.map((f) => (
                  <article key={f.num} className="bg-jgd-bg px-6 py-8">
                    <p className="text-[0.7rem] tracking-[2px] mb-3 text-jgd-accent">
                      {f.num}
                    </p>
                    <h3 className="mb-2.5 font-serif text-[1.15rem] font-normal">
                      {f.title}
                    </h3>
                    <p className="text-[0.84rem] text-jgd-dim leading-[1.7]">
                      {f.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="text-center relative py-[140px] border-t border-jgd-border">
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none size-[400px]"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.75 0.18 142 / 0.03), transparent 70%)",
              }}
            />
            <div className="relative max-w-[820px] mx-auto px-6">
              <h2 className="mb-4 font-serif text-[clamp(1.8rem,4vw,2.8rem)] font-normal tracking-[-1px] leading-[1.2]">
                Get early access
              </h2>
              <p className="text-[0.88rem] mx-auto mb-10 text-center text-jgd-dim max-w-[600px] leading-[1.9]">
                We&apos;ll let you know when the index goes live. No spam.
              </p>
              <WaitlistForm />
            </div>
          </section>

          {/* ── LinkedIn ── */}
          <div className="text-center py-4 text-[0.78rem] text-jgd-dim">
            Connect with me on LinkedIn:{" "}
            <a
              href="https://linkedin.com/in/nabin-pokhrel"
              className="text-jgd-accent"
            >
              Nabin Pokhrel
            </a>
          </div>

          {/* ── Footer ── */}
          <footer className="text-center text-[0.72rem] uppercase tracking-[2px] py-10 text-jgd-dim border-t border-jgd-border">
            &copy; 2026 JustGetDomain
          </footer>
        </>
      )}
    </div>
  );
}

// ─── Domain Tile ───────────────────────────────────────────────────────

function DomainTile({
  domain,
  index,
  isExpanded,
  onToggle,
}: {
  domain: DomainEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "jgd-tile-in flex flex-col cursor-pointer transition-colors group px-5 pt-5 pb-4 border-b border-r border-jgd-border",
        isExpanded ? "bg-[oklch(0.22_0.01_142)]" : "bg-jgd-bg"
      )}
      style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
      onClick={onToggle}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          className={cn(
            "font-serif text-2xl font-normal tracking-[-0.5px] transition-colors",
            isExpanded ? "text-jgd-accent" : "text-jgd-text"
          )}
        >
          {domain.name}
        </h2>
        <span className="text-[0.7rem] uppercase tracking-[1px] shrink-0 text-jgd-dim">
          {domain.length}L
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {domain.tlds.map((tld) => (
          <span
            key={tld}
            className="text-[0.74rem] px-2 py-0.5 rounded-sm bg-jgd-accent-dim text-jgd-accent font-sans"
          >
            {tld}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[0.72rem] uppercase tracking-[1.5px] text-jgd-dim">
        {domain.tlds.length} extension{domain.tlds.length !== 1 ? "s" : ""}{" "}
        available
      </p>

      {isExpanded && (
        <div className="mt-4 pt-4 flex flex-col gap-2 border-t border-jgd-accent/12">
          <p className="text-[0.7rem] uppercase tracking-[2px] mb-1 text-jgd-dim">
            Register at
          </p>
          {REGISTRARS.map((reg) => (
            <a
              key={reg.name}
              href={`${reg.url}${domain.name}${domain.tlds[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between text-[0.76rem] px-3 py-2 rounded transition-all text-jgd-text bg-jgd-accent/4 border border-jgd-accent/8 hover:bg-jgd-accent/10 hover:border-jgd-accent/20"
            >
              {reg.name}
              <ExternalLink size={12} className="text-jgd-dim" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────

function EmptyState({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-[120px]">
      <div className="mb-6 size-16 rounded-full bg-jgd-accent-dim flex items-center justify-center">
        <Search size={24} className="text-jgd-accent" />
      </div>
      <h3 className="mb-2 font-serif text-[1.4rem] font-normal">
        No matches
      </h3>
      <p className="text-[0.8rem] max-w-[360px] mb-6 text-jgd-dim leading-[1.7]">
        Nothing matched &ldquo;{query.trim()}&rdquo; in the available set. Try
        a shorter query or different letters.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer text-[0.7rem] uppercase tracking-[2px] px-5 py-2.5 rounded transition-colors text-jgd-accent border border-jgd-accent/20 bg-jgd-accent-dim hover:bg-jgd-accent/15"
      >
        Clear search
      </button>
    </div>
  );
}

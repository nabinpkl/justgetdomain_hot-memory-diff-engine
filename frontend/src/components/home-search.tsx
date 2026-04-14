"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, X, SlidersHorizontal, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalDemo } from "@/components/terminal-demo";
import { WaitlistForm } from "@/components/waitlist-form";
import { REGISTRARS } from "@/components/domain/domain-data";
import { FilterPanel, useFilterState } from "@/components/domain/filter-panel";
import { EmptyState } from "@/components/domain/empty-state";
import { UpdatedIndicator } from "@/components/domain/updated-indicator";
import { DisclaimerCard } from "@/components/disclaimer-card";
import { useDomainSearch } from "@/hooks/use-domain-search";

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

const ROW_HEIGHT = 48;
const OVERSCAN = 20;

// ─── Main Component ────────────────────────────────────────────────────

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const {
    activeTlds,
    activeLengths,
    sort,
    setSort,
    toggleTld,
    toggleLength,
    clearFilters,
    hasActiveFilters,
  } = useFilterState();

  const isSearching = query.trim().length > 0 || hasActiveFilters;
  const hasAnyActive = hasActiveFilters || query.trim().length > 0;

  const { total, getRows, ensureRange, isLoading } = useDomainSearch({
    query: isSearching ? query : "",
    tlds: isSearching ? activeTlds : new Set<string>(),
    lengths: isSearching ? activeLengths : new Set<number>(),
    sort,
  });

  const clearAll = () => {
    clearFilters();
    setQuery("");
    inputRef.current?.focus();
  };

  useEffect(() => {
    setExpandedRow(null);
  }, [query]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerHeight(el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSearching]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  const totalHeight = total * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN;
  const endIndex = Math.min(total - 1, startIndex + visibleCount);

  useEffect(() => {
    if (isSearching && total > 0) ensureRange(startIndex, endIndex);
  }, [startIndex, endIndex, total, isSearching, ensureRange]);

  const visibleEntries =
    isSearching && total > 0 ? getRows(startIndex, endIndex) : [];

  return (
    <div className="overflow-x-hidden bg-jgd-bg text-jgd-text font-sans font-medium leading-[1.7]">
      {/* ── Hero / Search ── */}
      <div
        className={cn(
          "relative flex flex-col transition-[min-height] duration-700 jgd-ease-out",
          isSearching ? "min-h-0" : "min-h-[calc(100vh-3.5rem)]"
        )}
      >
        {/* Top spacer */}
        <div
          className={cn(
            "transition-[flex-grow] duration-700 jgd-ease-out",
            isSearching ? "grow-0" : "grow"
          )}
        />

        {/* Title block */}
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
          <p className="text-[0.88rem] uppercase tracking-[6px] text-jgd-dim">
            Every available short domain. Already found.
          </p>
        </div>

        {/* ── Search bar ── */}
        <div
          className={cn(
            "relative sticky top-14 z-40 w-full transition-all duration-500 jgd-ease-out",
            isSearching
              ? "bg-jgd-nav backdrop-blur-[20px] border-b border-b-jgd-border px-6 py-4"
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

            {/* Explore hint — shown when not actively searching */}
            {!isSearching && (
              <p className="mt-5 text-center text-[0.95rem] text-jgd-dim leading-[1.7]">
                Don&apos;t know what you&apos;re looking for?{" "}
                <Link
                  href="/domains"
                  className="text-jgd-accent border-b border-jgd-accent/30 hover:border-jgd-accent transition-colors"
                >
                  Explore millions of available domains
                </Link>
              </p>
            )}

            {/* Result count + mobile filter toggle */}
            {isSearching && (
              <div className="flex items-center gap-4 mt-3 text-[0.72rem] uppercase tracking-[2px] text-jgd-dim">
                <span>
                  {isLoading
                    ? "Loading..."
                    : `${total.toLocaleString()} domain${total !== 1 ? "s" : ""} found`}
                </span>
                <span className="text-jgd-muted">/</span>
                <UpdatedIndicator />
                <button
                  type="button"
                  className={cn(
                    "ml-auto flex items-center gap-1.5 cursor-pointer transition-colors sm:hidden",
                    showFilters ? "text-jgd-accent" : "text-jgd-dim"
                  )}
                  onClick={() => setShowFilters((p) => !p)}
                >
                  <SlidersHorizontal size={12} />
                  Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom spacer */}
        <div
          className={cn(
            "transition-[flex-grow] duration-700 jgd-ease-out",
            isSearching ? "grow-0" : "grow"
          )}
        />
      </div>

      {/* ── Results with sidebar filters ── */}
      {isSearching && (
        <div className="max-w-[1200px] mx-auto w-full flex" style={{ height: "calc(100vh - 110px)" }}>
          {/* Sidebar filters — desktop */}
          <aside className="hidden sm:block shrink-0 w-[200px] border-r border-jgd-border p-6 pr-5">
            <FilterPanel
              activeTlds={activeTlds}
              activeLengths={activeLengths}
              sort={sort}
              onToggleTld={toggleTld}
              onToggleLength={toggleLength}
              onSort={setSort}
              hasActiveFilters={hasAnyActive}
              onClear={clearAll}
            />
          </aside>

          {/* Mobile filter drawer */}
          {showFilters && (
            <div
              className="fixed inset-0 z-40 sm:hidden bg-jgd-overlay"
              onClick={() => setShowFilters(false)}
            >
              <div
                className="absolute bottom-0 left-0 right-0 p-6 rounded-t-xl bg-jgd-surface border-t border-jgd-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[0.7rem] uppercase tracking-[2px] font-bold">
                    Filters
                  </span>
                  <button
                    type="button"
                    className="cursor-pointer text-jgd-dim"
                    onClick={() => setShowFilters(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <FilterPanel
                  activeTlds={activeTlds}
                  activeLengths={activeLengths}
                  sort={sort}
                  onToggleTld={toggleTld}
                  onToggleLength={toggleLength}
                  onSort={setSort}
                  hasActiveFilters={hasAnyActive}
                  onClear={clearAll}
                />
              </div>
            </div>
          )}

          {/* Virtual scroll results */}
          <main
            ref={scrollRef}
            className="flex-1 min-w-0 overflow-y-auto"
            onScroll={handleScroll}
          >
            {!isLoading && total === 0 ? (
              <EmptyState
                query={query}
                hasFilters={hasActiveFilters}
                onClear={clearAll}
              />
            ) : (
              <div style={{ height: totalHeight, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: startIndex * ROW_HEIGHT,
                    left: 0,
                    right: 0,
                  }}
                >
                  {visibleEntries.map((entry, i) => {
                    const globalIndex = startIndex + i;
                    if (!entry) {
                      return (
                        <div
                          key={`ph-${globalIndex}`}
                          className="flex items-center px-5 border-b border-jgd-border animate-pulse"
                          style={{ height: ROW_HEIGHT }}
                        >
                          <div className="h-4 w-40 bg-jgd-surface rounded" />
                        </div>
                      );
                    }

                    const isExpanded = expandedRow === entry.name;

                    return (
                      <div key={`${entry.name}-${globalIndex}`}>
                        <div
                          className="flex items-center gap-4 px-5 cursor-pointer transition-colors hover:bg-jgd-surface/50 border-b border-jgd-border"
                          style={{ height: ROW_HEIGHT }}
                          onClick={() => setExpandedRow(isExpanded ? null : entry.name)}
                        >
                          <span className="font-serif text-[1.05rem] tracking-[-0.3px] text-jgd-text">
                            {entry.name}
                          </span>
                          <span className="text-[0.72rem] px-2 py-0.5 rounded-sm bg-jgd-accent-dim text-jgd-accent font-sans">
                            {entry.tld}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="flex gap-2 px-5 py-3 bg-jgd-row-active border-b border-jgd-border">
                            {REGISTRARS.map((reg) => (
                              <a
                                key={reg.name}
                                href={`${reg.url}${entry.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[0.76rem] px-3 py-2 rounded transition-all text-jgd-text bg-jgd-accent/4 border border-jgd-accent/8 hover:bg-jgd-accent/10 hover:border-jgd-accent/20"
                              >
                                {reg.name}
                                <ExternalLink size={12} className="text-jgd-dim" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ── Landing sections (visible when not searching) ── */}
      {!isSearching && (
        <>
          {/* Terminal demo */}
          <div className="jgd-fade-up flex justify-center px-6 pb-8 -mt-[120px] [animation-delay:0.45s]">
            <TerminalDemo />
          </div>

          <div className="jgd-fade-up px-6 pb-16 max-w-[640px] mx-auto [animation-delay:0.6s]">
            <DisclaimerCard />
          </div>

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
              <p className="text-[1rem] max-w-[600px] text-jgd-dim leading-[1.9]">
                The current workflow is broken. You think of a name, type it
                into a registrar, see &quot;taken,&quot; think of another, see
                &quot;taken&quot; again, repeat forty times, settle for something
                you don&apos;t love, or give up entirely. Chatbots aren&apos;t
                better &mdash; they&apos;ll happily suggest names that have been
                registered since 2004.
              </p>
              <p className="text-[1rem] max-w-[600px] mt-5 text-jgd-dim leading-[1.9]">
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
                    <p className="text-[0.95rem] text-jgd-dim leading-[1.8]">
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
              <p className="text-[1rem] max-w-[600px] text-jgd-dim leading-[1.9]">
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
                      <p className="text-[0.95rem] text-jgd-dim leading-[1.7]">
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
                    <p className="text-[0.95rem] text-jgd-dim leading-[1.7]">
                      {f.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="text-center relative py-[140px] border-t border-jgd-border">
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
          <div className="text-center py-4 text-[0.9rem] text-jgd-dim">
            Connect with me on LinkedIn:{" "}
            <a
              href="https://linkedin.com/in/nabin-pokhrel"
              className="text-jgd-accent"
            >
              Nabin Pokhrel
            </a>
          </div>

          {/* ── Footer ── */}
          <footer className="text-center text-[0.8rem] uppercase tracking-[2px] py-10 text-jgd-dim border-t border-jgd-border">
            &copy; 2026 JustGetDomain
          </footer>
        </>
      )}
    </div>
  );
}

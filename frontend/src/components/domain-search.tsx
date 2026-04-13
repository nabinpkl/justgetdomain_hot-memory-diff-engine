"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ArrowLeft, SlidersHorizontal, X, ExternalLink } from "lucide-react";

// ─── Mock data (will be replaced by SSE from Rust backend) ──────────────
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

const ALL_TLDS = [".com", ".dev", ".io", ".app", ".sh", ".xyz", ".net", ".org"];
const LENGTHS = [3, 4, 5] as const;

type SortMode = "alpha" | "tlds" | "shortest";

// ─── Component ──────────────────────────────────────────────────────────

export function DomainSearch() {
  const [query, setQuery] = useState("");
  const [activeTlds, setActiveTlds] = useState<Set<string>>(new Set());
  const [activeLengths, setActiveLengths] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<SortMode>("tlds");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + 24);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Filter + sort logic
  const results = useMemo(() => {
    let filtered = MOCK_DOMAINS;

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter((d) => d.name.includes(q));
    }

    if (activeTlds.size > 0) {
      filtered = filtered.filter((d) =>
        d.tlds.some((tld) => activeTlds.has(tld))
      );
    }

    if (activeLengths.size > 0) {
      filtered = filtered.filter((d) => activeLengths.has(d.length));
    }

    const sorted = [...filtered];
    switch (sort) {
      case "alpha":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "tlds":
        sorted.sort((a, b) => b.tlds.length - a.tlds.length);
        break;
      case "shortest":
        sorted.sort((a, b) => a.name.length - b.name.length);
        break;
    }

    return sorted;
  }, [query, activeTlds, activeLengths, sort]);

  const toggleTld = useCallback((tld: string) => {
    setActiveTlds((prev) => {
      const next = new Set(prev);
      if (next.has(tld)) next.delete(tld);
      else next.add(tld);
      return next;
    });
  }, []);

  const toggleLength = useCallback((len: number) => {
    setActiveLengths((prev) => {
      const next = new Set(prev);
      if (next.has(len)) next.delete(len);
      else next.add(len);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTlds(new Set());
    setActiveLengths(new Set());
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const hasActiveFilters = activeTlds.size > 0 || activeLengths.size > 0 || query.trim().length > 0;
  const displayed = results.slice(0, visibleCount);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--jgd-bg)",
        color: "var(--jgd-text)",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      {/* ── Top bar ── */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-4 px-5 py-3 backdrop-blur-2xl"
        style={{
          background: "oklch(0.02 0 0 / 0.9)",
          borderBottom: "1px solid var(--jgd-border)",
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[1.5px] transition-colors"
          style={{ color: "var(--jgd-dim)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--jgd-text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--jgd-dim)")}
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </Link>

        <span
          className="text-[0.7rem] font-bold uppercase tracking-[1.5px]"
          style={{ color: "var(--jgd-accent)" }}
        >
          JustGetDomain
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span
            className="text-[0.6rem] uppercase tracking-[2px]"
            style={{ color: "var(--jgd-dim)" }}
          >
            {results.length} found
          </span>
        </div>
      </nav>

      {/* ── Search hero ── */}
      <div
        className="relative"
        style={{
          borderBottom: "1px solid var(--jgd-border)",
        }}
      >
        {/* Ambient gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 800px 200px at 50% 100%, oklch(0.87 0.29 142 / 0.03), transparent)",
          }}
        />

        <div className="relative max-w-[1200px] mx-auto px-5 pt-10 pb-8 sm:pt-14 sm:pb-10">
          <h1
            className="mb-6"
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
              fontWeight: 400,
              letterSpacing: "-1px",
              lineHeight: 1.1,
            }}
          >
            {query.trim() ? (
              <>
                Results for{" "}
                <span style={{ color: "var(--jgd-accent)" }}>
                  &ldquo;{query.trim()}&rdquo;
                </span>
              </>
            ) : (
              <>
                Browse available
                <br />
                domains
                <span style={{ color: "var(--jgd-accent)" }}>.</span>
              </>
            )}
          </h1>

          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3 transition-all"
            style={{
              background: "var(--jgd-surface)",
              border: "1px solid var(--jgd-border)",
              borderRadius: "6px",
            }}
            onClick={() => inputRef.current?.focus()}
          >
            <Search size={16} style={{ color: "var(--jgd-dim)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(24);
              }}
              placeholder="Search by name, pattern, or letters..."
              className="flex-1 bg-transparent outline-none text-[0.88rem] placeholder:opacity-40"
              style={{
                color: "var(--jgd-text)",
                fontFamily: "var(--font-mono), monospace",
                caretColor: "var(--jgd-accent)",
              }}
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="transition-colors cursor-pointer"
                style={{ color: "var(--jgd-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--jgd-text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--jgd-dim)")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div
            className="flex items-center gap-4 mt-4 text-[0.65rem] uppercase tracking-[2px]"
            style={{ color: "var(--jgd-dim)" }}
          >
            <span>
              {results.length.toLocaleString()} domains
            </span>
            <span style={{ color: "var(--jgd-border)" }}>/</span>
            <span>Updated 4h ago</span>
            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 cursor-pointer transition-colors sm:hidden"
              style={{ color: showFilters ? "var(--jgd-accent)" : "var(--jgd-dim)" }}
              onClick={() => setShowFilters((p) => !p)}
            >
              <SlidersHorizontal size={12} />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto flex">
        {/* Sidebar filters — desktop */}
        <aside
          className="hidden sm:block shrink-0 sticky top-[53px] self-start overflow-y-auto"
          style={{
            width: "200px",
            maxHeight: "calc(100vh - 53px)",
            borderRight: "1px solid var(--jgd-border)",
            padding: "24px 20px",
          }}
        >
          <FilterPanel
            activeTlds={activeTlds}
            activeLengths={activeLengths}
            sort={sort}
            onToggleTld={toggleTld}
            onToggleLength={toggleLength}
            onSort={setSort}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        </aside>

        {/* Mobile filter drawer */}
        {showFilters && (
          <div
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: "oklch(0 0 0 / 0.6)" }}
            onClick={() => setShowFilters(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 p-6 rounded-t-xl"
              style={{
                background: "var(--jgd-surface)",
                borderTop: "1px solid var(--jgd-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-[0.7rem] uppercase tracking-[2px] font-bold">
                  Filters
                </span>
                <button
                  type="button"
                  className="cursor-pointer"
                  style={{ color: "var(--jgd-dim)" }}
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
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            </div>
          </div>
        )}

        {/* Results area */}
        <main className="flex-1 min-w-0">
          {displayed.length === 0 ? (
            <EmptyState query={query} onClear={clearFilters} />
          ) : (
            <>
              <div
                className="grid gap-px"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  background: "var(--jgd-border)",
                }}
              >
                {displayed.map((domain, i) => (
                  <DomainTile
                    key={domain.name}
                    domain={domain}
                    index={i}
                    activeTlds={activeTlds}
                    isExpanded={expandedDomain === domain.name}
                    onToggle={() =>
                      setExpandedDomain(
                        expandedDomain === domain.name ? null : domain.name
                      )
                    }
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {visibleCount < results.length && (
                <div ref={sentinelRef} className="py-12 text-center">
                  <span
                    className="text-[0.65rem] uppercase tracking-[3px]"
                    style={{ color: "var(--jgd-dim)" }}
                  >
                    Loading more...
                  </span>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Filter Panel ───────────────────────────────────────────────────────

function FilterPanel({
  activeTlds,
  activeLengths,
  sort,
  onToggleTld,
  onToggleLength,
  onSort,
  hasActiveFilters,
  onClear,
}: {
  activeTlds: Set<string>;
  activeLengths: Set<number>;
  sort: SortMode;
  onToggleTld: (tld: string) => void;
  onToggleLength: (len: number) => void;
  onSort: (mode: SortMode) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      {/* TLD section */}
      <div>
        <p
          className="text-[0.6rem] uppercase tracking-[3px] mb-3"
          style={{ color: "var(--jgd-dim)" }}
        >
          Extensions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TLDS.map((tld) => {
            const active = activeTlds.has(tld);
            return (
              <button
                key={tld}
                type="button"
                onClick={() => onToggleTld(tld)}
                className="cursor-pointer text-[0.72rem] px-2.5 py-1 rounded transition-all"
                style={{
                  background: active
                    ? "var(--jgd-accent-dim)"
                    : "transparent",
                  color: active ? "var(--jgd-accent)" : "var(--jgd-dim)",
                  border: `1px solid ${active ? "oklch(0.87 0.29 142 / 0.2)" : "var(--jgd-border)"}`,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {tld}
              </button>
            );
          })}
        </div>
      </div>

      {/* Length section */}
      <div>
        <p
          className="text-[0.6rem] uppercase tracking-[3px] mb-3"
          style={{ color: "var(--jgd-dim)" }}
        >
          Length
        </p>
        <div className="flex gap-1.5">
          {LENGTHS.map((len) => {
            const active = activeLengths.has(len);
            return (
              <button
                key={len}
                type="button"
                onClick={() => onToggleLength(len)}
                className="cursor-pointer text-[0.72rem] px-3 py-1 rounded transition-all"
                style={{
                  background: active
                    ? "var(--jgd-accent-dim)"
                    : "transparent",
                  color: active ? "var(--jgd-accent)" : "var(--jgd-dim)",
                  border: `1px solid ${active ? "oklch(0.87 0.29 142 / 0.2)" : "var(--jgd-border)"}`,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {len}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort section */}
      <div>
        <p
          className="text-[0.6rem] uppercase tracking-[3px] mb-3"
          style={{ color: "var(--jgd-dim)" }}
        >
          Sort by
        </p>
        <div className="flex flex-col gap-1">
          {([
            ["tlds", "Most TLDs"],
            ["alpha", "A \u2192 Z"],
            ["shortest", "Shortest"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSort(mode)}
              className="cursor-pointer text-left text-[0.72rem] px-2.5 py-1.5 rounded transition-all"
              style={{
                background: sort === mode ? "var(--jgd-accent-dim)" : "transparent",
                color: sort === mode ? "var(--jgd-accent)" : "var(--jgd-dim)",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-[0.65rem] uppercase tracking-[2px] py-2 rounded transition-colors"
          style={{
            color: "var(--jgd-dim)",
            border: "1px solid var(--jgd-border)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--jgd-text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--jgd-dim)")}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// ─── Domain Tile ────────────────────────────────────────────────────────

const REGISTRARS = [
  { name: "Namecheap", url: "https://www.namecheap.com/domains/registration/results/?domain=" },
  { name: "Porkbun", url: "https://porkbun.com/checkout/search?q=" },
  { name: "Cloudflare", url: "https://www.cloudflare.com/products/registrar/" },
];

function DomainTile({
  domain,
  index,
  activeTlds,
  isExpanded,
  onToggle,
}: {
  domain: DomainEntry;
  index: number;
  activeTlds: Set<string>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tlds =
    activeTlds.size > 0
      ? domain.tlds.filter((t) => activeTlds.has(t))
      : domain.tlds;

  return (
    <div
      className="jgd-tile-in flex flex-col cursor-pointer transition-colors group"
      style={{
        background: isExpanded ? "oklch(0.06 0.01 142)" : "var(--jgd-bg)",
        padding: "20px 20px 16px",
        animationDelay: `${Math.min(index * 30, 600)}ms`,
      }}
      onClick={onToggle}
    >
      {/* Domain name */}
      <div className="flex items-baseline justify-between gap-2">
        <h2
          className="transition-colors"
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: "1.5rem",
            fontWeight: 400,
            letterSpacing: "-0.5px",
            color: isExpanded ? "var(--jgd-accent)" : "var(--jgd-text)",
          }}
        >
          {domain.name}
        </h2>
        <span
          className="text-[0.6rem] uppercase tracking-[1px] shrink-0"
          style={{ color: "var(--jgd-dim)" }}
        >
          {domain.length}L
        </span>
      </div>

      {/* TLD pills */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {tlds.map((tld) => (
          <span
            key={tld}
            className="text-[0.68rem] px-2 py-0.5 rounded-sm"
            style={{
              background: "var(--jgd-accent-dim)",
              color: "var(--jgd-accent)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            {tld}
          </span>
        ))}
      </div>

      {/* Available count */}
      <p
        className="mt-3 text-[0.62rem] uppercase tracking-[1.5px]"
        style={{ color: "var(--jgd-dim)" }}
      >
        {tlds.length} extension{tlds.length !== 1 ? "s" : ""} available
      </p>

      {/* Expanded — register links */}
      {isExpanded && (
        <div
          className="mt-4 pt-4 flex flex-col gap-2"
          style={{ borderTop: "1px solid oklch(0.87 0.29 142 / 0.12)" }}
        >
          <p
            className="text-[0.58rem] uppercase tracking-[2px] mb-1"
            style={{ color: "var(--jgd-dim)" }}
          >
            Register at
          </p>
          {REGISTRARS.map((reg) => (
            <a
              key={reg.name}
              href={`${reg.url}${domain.name}${tlds[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between text-[0.72rem] px-3 py-2 rounded transition-all"
              style={{
                color: "var(--jgd-text)",
                background: "oklch(0.87 0.29 142 / 0.04)",
                border: "1px solid oklch(0.87 0.29 142 / 0.08)",
                fontFamily: "var(--font-mono), monospace",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "oklch(0.87 0.29 142 / 0.1)";
                e.currentTarget.style.borderColor = "oklch(0.87 0.29 142 / 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "oklch(0.87 0.29 142 / 0.04)";
                e.currentTarget.style.borderColor = "oklch(0.87 0.29 142 / 0.08)";
              }}
            >
              {reg.name}
              <ExternalLink size={12} style={{ color: "var(--jgd-dim)" }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────

function EmptyState({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: "120px 24px" }}
    >
      <div
        className="mb-6"
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "var(--jgd-accent-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Search size={24} style={{ color: "var(--jgd-accent)" }} />
      </div>
      <h3
        className="mb-2"
        style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: "1.4rem",
          fontWeight: 400,
        }}
      >
        No matches
      </h3>
      <p
        className="text-[0.8rem] max-w-[360px] mb-6"
        style={{ color: "var(--jgd-dim)", lineHeight: 1.7 }}
      >
        {query.trim()
          ? `Nothing matched "${query.trim()}" with the current filters. Try broadening your search.`
          : "No domains match the current filters. Try removing some."}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer text-[0.7rem] uppercase tracking-[2px] px-5 py-2.5 rounded transition-colors"
        style={{
          color: "var(--jgd-accent)",
          border: "1px solid oklch(0.87 0.29 142 / 0.2)",
          background: "var(--jgd-accent-dim)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "oklch(0.87 0.29 142 / 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--jgd-accent-dim)";
        }}
      >
        Clear filters
      </button>
    </div>
  );
}

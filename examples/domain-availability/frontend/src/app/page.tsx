"use client";

import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Bookmark,
  Box,
  Check,
  Code2,
  Copy,
  Layers3,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { useVirtualShelfData } from "@/hooks/use-shelf-data";
import { useShortlist } from "@/stores/use-shortlist";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "JustGetDomain",
  url: "https://justgetdomain.com",
  description:
    "An in-process verification tool for taken-name problems: domains, usernames, package names, breached passwords. Microsecond lookups, nightly rebuilds with no downtime, no database. Designed as a tool an LLM agent can call freely on every candidate it generates.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
  },
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    tlds: [],
    length: null,
    available: null,
  });

  const toggleTldFilter = (tld: string) => {
    setFilters((current) => ({
      ...current,
      tlds: current.tlds.includes(tld)
        ? current.tlds.filter((item) => item !== tld)
        : [...current.tlds, tld],
    }));
  };

  const setLengthFilter = (length: SearchFilters["length"]) => {
    setFilters((current) => ({
      ...current,
      length: current.length === length ? null : length,
    }));
  };

  const setAvailableFilter = (available: SearchFilters["available"]) => {
    setFilters((current) => ({
      ...current,
      available: current.available === available ? null : available,
    }));
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen overflow-x-clip bg-[#fbfbfa] text-[#111318] font-sans font-medium">
        <main className="mx-auto w-full max-w-[1500px] px-[clamp(20px,3vw,48px)] pb-6 pt-[46px]">
          <section className="grid grid-cols-1 items-start gap-x-10 gap-y-7 lg:grid-cols-[500px_minmax(0,1fr)]">
            <div className="min-w-0 pl-3 pt-2">
              <h1 className="font-serif text-[clamp(2.1rem,2.75vw,2.68rem)] font-normal leading-[1.05] tracking-[0] text-black">
                Browse names that are still{" "}
                <span className="text-[#087d36]">open.</span>
              </h1>
              <p className="mt-4 text-[clamp(1.02rem,1.15vw,1.22rem)] leading-[1.35] text-[#687187]">
                Short domains checked across 1,012 TLDs.
              </p>
            </div>

            <div className="min-w-0 space-y-[18px] lg:max-w-[900px]">
              <div className="relative h-[54px] rounded-[8px] border border-[#d8dee8] bg-white shadow-[0_1px_2px_rgba(14,22,36,0.04)]">
                <Search
                  size={25}
                  strokeWidth={1.8}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-[#111318]"
                  aria-hidden
                />
                <input
                  aria-label="Search domains"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9.-]/g, ""),
                    )
                  }
                  placeholder="search available domains faster"
                  className="h-full w-full rounded-[8px] bg-transparent pl-[70px] pr-[78px] text-[1.05rem] font-medium text-[#111318] outline-none placeholder:text-[#949aab]"
                />
                <kbd className="absolute right-4 top-1/2 flex h-8 -translate-y-1/2 items-center rounded-[7px] border border-[#dce2ec] bg-white px-3 text-[0.92rem] font-semibold text-[#434b5d] shadow-[0_1px_1px_rgba(14,22,36,0.03)]">
                  ⌘ K
                </kbd>
              </div>

              <div className="flex items-center gap-[16px] overflow-x-auto pb-1">
                {[".sh", ".dev", ".ai", ".space"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={filters.tlds.includes(filter)}
                    onClick={() => toggleTldFilter(filter)}
                    className={filterChipClass(filters.tlds.includes(filter))}
                  >
                    {filter}
                  </button>
                ))}
                <span className="h-[36px] w-px shrink-0 bg-[#dfe4ed]" />
                <button
                  type="button"
                  aria-pressed={filters.length === "4"}
                  onClick={() => setLengthFilter("4")}
                  className={filterChipClass(filters.length === "4")}
                >
                  4 letters
                </button>
                <button
                  type="button"
                  aria-pressed={filters.length === "short"}
                  onClick={() => setLengthFilter("short")}
                  className={filterChipClass(filters.length === "short")}
                >
                  short
                </button>
                <button
                  type="button"
                  aria-pressed={filters.available === "4+"}
                  onClick={() => setAvailableFilter("4+")}
                  className={filterChipClass(filters.available === "4+")}
                >
                  many TLDs
                </button>
                <button
                  type="button"
                  aria-pressed={filters.available === "1"}
                  onClick={() => setAvailableFilter("1")}
                  className={filterChipClass(filters.available === "1")}
                >
                  rare open
                </button>
              </div>
            </div>
          </section>

          <DomainWorkbench
            searchQuery={searchQuery}
            filters={filters}
            onClearSearch={() => setSearchQuery("")}
          />
          <WhyBuilt />
        </main>
      </div>
    </>
  );
}

type SearchFilters = {
  tlds: string[];
  length: "4" | "short" | null;
  available: "1" | "2-3" | "4+" | null;
};

function filterChipClass(active: boolean): string {
  return `h-[38px] min-w-fit cursor-pointer rounded-[7px] border px-5 text-[0.86rem] font-semibold shadow-[0_1px_1px_rgba(14,22,36,0.025)] outline-none transition-all duration-150 hover:-translate-y-px hover:shadow-[0_5px_14px_rgba(15,23,42,0.06)] focus-visible:ring-2 focus-visible:ring-[#0b873f]/25 ${
    active
      ? "border-[#b7d9bf] bg-[#e8f5ec] text-[#087d36]"
      : "border-[#dfe4ed] bg-white text-black hover:border-[#b8c2d2] hover:bg-[#fbfcfd]"
  }`;
}

const shelves = [
  {
    id: "all",
    icon: Layers3,
    label: "All available",
    count: "6.8M",
    color: "green",
  },
  {
    id: "shortnames",
    icon: "Aa",
    label: "Short names",
    count: "3.8M",
    lengths: "3,4,5",
    color: "amber",
  },
  {
    id: "developer",
    icon: Code2,
    label: "Developer TLDs",
    count: "1.9K",
    tlds: ".dev",
    color: "blue",
  },
  {
    id: "tech",
    icon: Box,
    label: "Tech & brandable",
    count: "109",
    categories: "tech",
    tlds: ".dev,.tech,.ai",
    color: "cyan",
  },
  {
    id: "ai",
    icon: Sparkles,
    label: "AI & modern",
    count: "488",
    tlds: ".ai",
    color: "pink",
  },
  {
    id: "watchlist",
    icon: Bookmark,
    label: "Watchlist",
    count: "local",
    color: "slate",
  },
];

const DOMAIN_CARD_ROW_HEIGHT = 148;
const DOMAIN_CARD_GAP = 16;
const DOMAIN_GRID_VISIBLE_ROWS = 3;
const DOMAIN_GRID_INITIAL_PAGE_SIZE = 18;
const DOMAIN_GRID_PAGE_SIZE = 200;
const DOMAIN_GRID_PREFETCH_PAGES = 10;
const DOMAIN_GRID_RENDER_BUFFER_ITEMS = 200;
const TLD_LIST_ROW_HEIGHT = 34;
const TLD_LIST_INITIAL_PAGE_SIZE = 24;
const TLD_LIST_PAGE_SIZE = 200;
const TLD_LIST_PREFETCH_PAGES = 10;
const TLD_LIST_RENDER_BUFFER_ITEMS = 200;

function DomainWorkbench({
  searchQuery,
  filters,
  onClearSearch,
}: {
  searchQuery: string;
  filters: SearchFilters;
  onClearSearch: () => void;
}) {
  const [activeShelfId, setActiveShelfId] = useState("all");
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [selectedDomainKey, setSelectedDomainKey] = useState<string | null>(null);
  const shortlist = useShortlist();
  const normalizedQuery = searchQuery.trim();
  const isSearching = normalizedQuery.length > 0;
  const activeShelf =
    shelves.find((shelf) => shelf.id === (isSearching ? "all" : activeShelfId)) ?? shelves[0];
  const isWatchlist = activeShelf.id === "watchlist";
  const filterTlds = filters.tlds.length > 0 ? filters.tlds.join(",") : undefined;
  const queryTlds = mergeTldFilters(activeShelf.tlds, filterTlds);
  const queryLengths =
    filters.length === "4"
      ? "4"
      : filters.length === "short"
        ? "3,4,5"
        : activeShelf.lengths;

  useEffect(() => {
    if (isSearching) setActiveShelfId("all");
  }, [isSearching]);

  const {
    domains: apiDomains,
    total,
    totalCombos,
    isLoading,
    isFetchingRange,
    requestRange,
  } = useVirtualShelfData({
    tlds: queryTlds,
    lengths: queryLengths,
    available: filters.available ?? undefined,
    categories: activeShelf.categories,
    q: normalizedQuery || undefined,
    seed,
    initialLimit: DOMAIN_GRID_INITIAL_PAGE_SIZE,
    pageLimit: DOMAIN_GRID_PAGE_SIZE,
    mode: "combos",
  });

  const watchlistDomains = useMemo(
    () =>
      shortlist.items
        .map((domain) => {
          const [name, ...tldParts] = domain.split(".");
          const tld = tldParts.join(".");
          if (!name || !tld) return null;
          return { name, tld };
        })
        .filter((domain): domain is { name: string; tld: string } => Boolean(domain)),
    [shortlist.items],
  );

  const visibleDomains = isWatchlist ? watchlistDomains : apiDomains;
  const selectedDomain =
    visibleDomains.find(
      (domain) => domain && domainKey(domain) === selectedDomainKey,
    ) ??
    visibleDomains.find(Boolean) ??
    null;
  const resultCountLabel = isWatchlist
    ? `${shortlist.items.length} saved`
    : isLoading
      ? "Loading"
      : isSearching
        ? `${total.toLocaleString()} results`
        : `${total.toLocaleString()} names`;
  const shelfSearchLabel = isSearching && isLoading ? "Searching" : "Search results";

  useEffect(() => {
    setSelectedDomainKey(null);
  }, [activeShelf.id, filters.available, filters.length, filterTlds, normalizedQuery]);

  return (
    <section className="mt-5 overflow-hidden rounded-[10px] border border-[#dce2ea] bg-white shadow-[0_10px_34px_rgba(15,23,42,0.055)]">
      <div className="grid lg:grid-cols-[292px_1fr_330px]">
        <aside className="border-b border-[#dfe4ec] bg-[#fbfcfd] px-4 py-5 lg:border-b-0 lg:border-r">
          <p className="mb-4 px-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#71798c]">
            Shelves
          </p>
          <div className="space-y-0.5">
            {shelves.map((shelf) => (
              <ShelfItem
                key={shelf.label}
                {...shelf}
                label={shelf.id === "all" && isSearching ? shelfSearchLabel : shelf.label}
                active={shelf.id === activeShelf.id}
                count={
                  shelf.id === activeShelf.id && !isWatchlist
                    ? isSearching
                      ? isLoading
                        ? "..."
                        : formatCompact(total)
                      : totalCombos > 0
                        ? formatCompact(totalCombos)
                        : shelf.count
                    : shelf.id === "watchlist"
                      ? String(shortlist.items.length)
                      : shelf.count
                }
                onSelect={() => setActiveShelfId(shelf.id)}
              />
            ))}
          </div>
        </aside>

        <div className="border-b border-[#dfe4ec] p-5 lg:border-b-0">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 className="text-[1.05rem] font-bold text-black">
                {isSearching ? shelfSearchLabel : activeShelf.label}
              </h2>
              {isSearching && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="rounded-[6px] border border-[#dfe4ed] bg-white px-2.5 py-1 text-[0.72rem] font-bold text-[#566077] transition-colors hover:border-[#b8c2d2] hover:text-black"
                >
                  Clear
                </button>
              )}
            </div>
            <span className="shrink-0 text-[0.78rem] font-semibold text-[#687187]">
              {resultCountLabel}
            </span>
          </div>
          {isLoading && !isWatchlist ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[132px] rounded-[7px] border border-[#dfe4ec] bg-[#f7f8fa]"
                />
              ))}
            </div>
          ) : visibleDomains.length > 0 ? (
            <DomainGrid
              key={`${activeShelf.id}-${normalizedQuery}`}
              domains={visibleDomains}
              total={isWatchlist ? visibleDomains.length : total}
              shelfId={activeShelf.id}
              selectedKey={selectedDomain ? domainKey(selectedDomain) : null}
              onSelect={(domain) => setSelectedDomainKey(domainKey(domain))}
              isFetchingRange={!isWatchlist && isFetchingRange}
              requestRange={
                isWatchlist
                  ? () => {}
                  : requestRange
              }
            />
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-[7px] border border-dashed border-[#dfe4ec] text-[0.92rem] font-semibold text-[#687187]">
              {isWatchlist ? "Your watchlist is empty." : "No domains found."}
            </div>
          )}
        </div>

        <DomainDetail domain={selectedDomain} loading={isLoading && !isWatchlist} />
      </div>
    </section>
  );
}

function DomainGrid({
  domains,
  total,
  shelfId,
  selectedKey,
  onSelect,
  isFetchingRange,
  requestRange,
}: {
  domains: ({ name: string; tld: string } | undefined)[];
  total: number;
  shelfId: string;
  selectedKey: string | null;
  onSelect: (domain: { name: string; tld: string }) => void;
  isFetchingRange: boolean;
  requestRange: (start: number, end: number, options?: { immediate?: boolean }) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      setCols(width >= 680 ? 3 : width >= 460 ? 2 : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(total / cols);
  const rowsPerPage = Math.ceil(DOMAIN_GRID_PAGE_SIZE / cols);
  const renderRowBuffer = Math.ceil(DOMAIN_GRID_RENDER_BUFFER_ITEMS / cols);
  const prefetchRowBuffer = rowsPerPage * DOMAIN_GRID_PREFETCH_PAGES;
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => DOMAIN_CARD_ROW_HEIGHT + DOMAIN_CARD_GAP,
    overscan: renderRowBuffer,
  });

  const virtualRows = virtualizer.getVirtualItems();

  useEffect(() => {
    if (virtualRows.length === 0) return;

    const firstRow = virtualRows[0]?.index ?? 0;
    const lastRow = virtualRows.at(-1)?.index ?? firstRow;
    const start = Math.max(0, (firstRow - prefetchRowBuffer) * cols);
    const end = Math.min(total - 1, (lastRow + prefetchRowBuffer + 1) * cols - 1);
    if (end >= start) {
      requestRange(start, end);
    }
  }, [
    cols,
    prefetchRowBuffer,
    requestRange,
    total,
    virtualRows,
  ]);

  return (
    <div
      ref={scrollRef}
      className="h-[calc(148px*3+16px*2)] overflow-y-auto pr-2"
    >
      <div
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {isFetchingRange && (
          <div className="pointer-events-none sticky top-2 z-10 ml-auto mr-2 h-2 w-2 rounded-full bg-[#0b873f]/55" />
        )}
        {virtualRows.map((row) => {
          const rowStart = row.index * cols;
          return (
            <div
              key={row.key}
              className="absolute left-0 right-0 grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                transform: `translateY(${row.start}px)`,
              }}
            >
              {Array.from({ length: cols }, (_, col) => {
                const index = rowStart + col;
                if (index >= total) return <div key={col} />;
                const domain = domains[index];
                if (!domain) {
                  return (
                    <div
                      key={index}
                      className="h-[132px] rounded-[7px] border border-[#dfe4ec] bg-[#f7f8fa]"
                    />
                  );
                }
                return (
                  <DomainCard
                    key={`${domain.name}.${domain.tld}`}
                    {...domain}
                    tags={tagsForDomain(domain, shelfId)}
                    selected={domainKey(domain) === selectedKey}
                    onSelect={() => onSelect(domain)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompact(value: number): string {
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function tagsForDomain(domain: { name: string; tld: string }, shelfId: string): string[] {
  const tags = [domain.name.length <= 5 ? "short" : `${domain.name.length} chars`];
  if (domain.tld === "dev") tags.push("dev");
  if (domain.tld === "ai") tags.push("ai");
  if (domain.tld === "tech") tags.push("tech");
  if (shelfId === "tech") tags.push("brandable");
  return Array.from(new Set(tags)).slice(0, 3);
}

function domainKey(domain: { name: string; tld: string }): string {
  return `${domain.name}.${domain.tld}`;
}

function stripDot(tld: string): string {
  return tld.startsWith(".") ? tld.slice(1) : tld;
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function mergeTldFilters(shelfTlds?: string, chipTlds?: string): string | undefined {
  if (!shelfTlds) return chipTlds;
  if (!chipTlds) return shelfTlds;

  const shelf = new Set(shelfTlds.split(",").map((tld) => tld.trim()));
  const merged = chipTlds
    .split(",")
    .map((tld) => tld.trim())
    .filter((tld) => shelf.has(tld));
  return merged.length > 0 ? merged.join(",") : "__none__";
}

function ShelfItem({
  icon: Icon,
  label,
  count,
  active,
  color,
  onSelect,
}: (typeof shelves)[number] & {
  active: boolean;
  count: string;
  onSelect: () => void;
}) {
  const colorClass =
    color === "green"
      ? "bg-[#e8f5ec] text-[#087d36]"
      : color === "amber"
        ? "bg-[#fff4dc] text-[#ff9e17]"
        : color === "blue"
          ? "bg-[#eaf4ff] text-[#3c9cff]"
          : color === "violet"
            ? "bg-[#f0e9ff] text-[#8854ff]"
            : color === "cyan"
              ? "bg-[#e7f8fb] text-[#19aac0]"
              : color === "pink"
                ? "bg-[#ffe8f1] text-[#ff4f8e]"
                : "bg-[#eef2f7] text-[#697286]";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex h-[35px] w-full cursor-pointer items-center gap-3 rounded-[7px] px-2.5 text-left text-[0.95rem] outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#0b873f]/25 ${
        active
          ? "bg-[#e8f5ec] font-semibold text-[#087d36] shadow-[inset_0_0_0_1px_rgba(11,135,63,0.08)]"
          : "bg-transparent font-medium text-[#334155] hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(216,222,232,0.9),0_1px_2px_rgba(14,22,36,0.035)]"
      }`}
    >
      <span
        className={`flex size-[28px] items-center justify-center rounded-[6px] transition-transform duration-150 group-hover:scale-[1.04] ${colorClass}`}
      >
        {typeof Icon === "string" ? (
          <span className="text-[0.82rem] font-bold">{Icon}</span>
        ) : (
          <Icon size={17} strokeWidth={1.8} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <span className="text-[0.89rem] font-medium text-[#566077] transition-colors group-hover:text-[#1f2937]">
        {count}
      </span>
    </button>
  );
}

function DomainCard({
  name,
  tld,
  tags,
  selected,
  onSelect,
}: {
  name: string;
  tld: string;
  tags: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  const shortlist = useShortlist();
  const fullDomain = `${name}.${tld}`;
  const saved = shortlist.items.includes(fullDomain);
  const toggleSaved = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    saved ? shortlist.remove(fullDomain) : shortlist.add(fullDomain);
  };

  return (
    <article
      onClick={onSelect}
      className={`group h-[132px] cursor-pointer rounded-[7px] border bg-white p-4 shadow-[0_1px_2px_rgba(14,22,36,0.025)] transition-all duration-150 hover:-translate-y-px hover:border-[#b8c2d2] hover:shadow-[0_8px_20px_rgba(15,23,42,0.07)] ${
        selected
          ? "border-[#9bcfaa] shadow-[0_8px_20px_rgba(15,23,42,0.07),inset_0_0_0_1px_rgba(11,135,63,0.12)]"
          : "border-[#dfe4ec]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[1.33rem] font-bold leading-none tracking-[0] text-black">
          {name}.<span className="text-[#087d36]">{tld}</span>
        </h2>
        <button
          type="button"
          onClick={toggleSaved}
          aria-label={saved ? `Remove ${fullDomain} from watchlist` : `Save ${fullDomain} to watchlist`}
          className="rounded-[6px] p-1 text-[#697286] transition-colors hover:bg-[#f2f5f9] hover:text-[#087d36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b873f]/25"
        >
          <Star
            size={21}
            strokeWidth={1.7}
            className={saved ? "fill-[#ffa51f] text-[#ffa51f]" : ""}
            aria-hidden
          />
        </button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-[6px] border border-[#dde3ed] bg-white px-3 py-1 text-[0.7rem] font-semibold text-[#5f687b]"
          >
            {tag}
          </span>
        ))}
      </div>
      <Copy
        size={17}
        strokeWidth={1.8}
        className="float-right -mt-5 text-[#697286] transition-colors group-hover:text-[#334155]"
        aria-hidden
      />
    </article>
  );
}

type TldApiResponse = {
  name: string;
  total: number;
  tlds: string[];
};

function useAvailableTlds(name: string | null) {
  const query = useInfiniteQuery({
    queryKey: ["available-tlds", name],
    enabled: Boolean(name),
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const offset = pageParam as number;
      const limit =
        offset === 0 ? TLD_LIST_INITIAL_PAGE_SIZE : TLD_LIST_PAGE_SIZE;
      const params = new URLSearchParams({
        name: name ?? "",
        limit: String(limit),
        offset: String(offset),
      });
      const response = await fetch(`/api/tlds-for?${params.toString()}`, {
        signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as TldApiResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.tlds.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
  });

  const tlds = useMemo(
    () =>
      Array.from(
        new Set(
          query.data?.pages.flatMap((page) => page.tlds.map(stripDot)) ?? [],
        ),
      ),
    [query.data],
  );

  return {
    tlds,
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isPending,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
  };
}

function DomainDetail({
  domain,
  loading,
}: {
  domain: { name: string; tld: string } | null;
  loading: boolean;
}) {
  if (!domain) {
    return <DomainDetailPlaceholder loading={loading} />;
  }

  return <DomainDetailContent domain={domain} />;
}

function DomainDetailContent({
  domain,
}: {
  domain: { name: string; tld: string };
}) {
  const name = domain.name;
  const tld = domain.tld;
  const fullDomain = `${name}.${tld}`;
  const [copied, setCopied] = useState(false);
  const {
    tlds,
    total,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAvailableTlds(domain?.name ?? null);
  const availableDomains = useMemo(() => {
    const ordered = [tld, ...tlds.filter((ext) => ext !== tld)];
    return Array.from(new Set(ordered));
  }, [tld, tlds]);
  const availableCount = Math.max(total, availableDomains.length);

  useEffect(() => {
    setCopied(false);
  }, [fullDomain]);

  const copySelectedDomain = async () => {
    try {
      await copyToClipboard(fullDomain);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="border-t border-[#dfe4ec] px-4 pb-1 pt-6 lg:border-l lg:border-t-0">
      <section className="rounded-[8px] border border-[#dfe4ec] bg-white px-5 py-3 shadow-[0_1px_2px_rgba(14,22,36,0.025)]">
        <div className="flex items-start justify-between">
          <h2 className="text-[1.36rem] font-bold leading-none text-black">
            {name}.<span className="text-[#087d36]">{tld}</span>
          </h2>
          <Star
            size={22}
            className="fill-[#ffa51f] text-[#ffa51f]"
            strokeWidth={1.6}
            aria-hidden
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-[0.86rem] text-[#4d586d]">
          <span className="size-2.5 rounded-full bg-[#0b873f]" /> available
        </div>
        <button
          type="button"
          onClick={copySelectedDomain}
          className="mt-3 flex h-9 w-full overflow-hidden rounded-[6px] bg-[#0b873f] text-[0.95rem] font-bold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.16)] transition-colors hover:bg-[#087d36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b873f]/25"
        >
          <span className="flex flex-1 items-center justify-center">
            {copied ? "Copied" : `Copy ${fullDomain}`}
          </span>
          <span className="flex w-10 items-center justify-center border-l border-white/55">
            {copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />}
          </span>
        </button>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-[#71798c]">
            Available domains
          </p>
          <span className="text-[0.68rem] font-bold text-[#697286]">
            {isLoading ? "Loading" : `${availableCount.toLocaleString()} open`}
          </span>
        </div>
        <AvailableDomainList
          name={name}
          currentTld={tld}
          tlds={availableDomains}
          total={availableCount}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />

        <div className="mt-2 grid grid-cols-2 border-t border-[#dfe4ec] pt-2 text-[0.62rem] font-semibold text-[#7a8395]">
          <span>Length</span>
          <span>Checked</span>
          <b className="text-[#1f2937]">{name.length}</b>
          <b className="text-[#1f2937]">11h ago</b>
        </div>
      </section>
    </aside>
  );
}

function DomainDetailPlaceholder({ loading }: { loading: boolean }) {
  return (
    <aside className="border-t border-[#dfe4ec] px-4 pb-1 pt-6 lg:border-l lg:border-t-0">
      <section className="rounded-[8px] border border-[#dfe4ec] bg-white px-5 py-3 shadow-[0_1px_2px_rgba(14,22,36,0.025)]">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-44 rounded-[6px] bg-[#eef2f7]" />
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#d8dee8]" />
              <div className="h-4 w-24 rounded-[5px] bg-[#eef2f7]" />
            </div>
            <div className="h-9 rounded-[6px] bg-[#e2e8f0]" />
            <div className="flex items-center justify-between">
              <div className="h-4 w-36 rounded-[5px] bg-[#eef2f7]" />
              <div className="h-3 w-14 rounded-[5px] bg-[#eef2f7]" />
            </div>
            <div className="h-[190px] rounded-[7px] border border-[#dfe4ec] bg-[#fbfcfd] p-1.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="mb-1 h-[30px] rounded-[6px] bg-white"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 border-t border-[#dfe4ec] pt-2">
              <div className="h-3 w-12 rounded-[5px] bg-[#eef2f7]" />
              <div className="h-3 w-14 rounded-[5px] bg-[#eef2f7]" />
              <div className="mt-2 h-4 w-5 rounded-[5px] bg-[#eef2f7]" />
              <div className="mt-2 h-4 w-14 rounded-[5px] bg-[#eef2f7]" />
            </div>
          </div>
        ) : (
          <div className="flex h-[330px] items-center justify-center text-center text-[0.82rem] font-semibold text-[#687187]">
            Select a domain to inspect it.
          </div>
        )}
      </section>
    </aside>
  );
}

function AvailableDomainList({
  name,
  currentTld,
  tlds,
  total,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  name: string;
  currentTld: string;
  tlds: string[];
  total: number;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowCount = isLoading ? 8 : Math.max(total, tlds.length);
  const prefetchRowBuffer = TLD_LIST_PAGE_SIZE * TLD_LIST_PREFETCH_PAGES;
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TLD_LIST_ROW_HEIGHT,
    overscan: TLD_LIST_RENDER_BUFFER_ITEMS,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const lastVirtualRow = virtualRows.at(-1)?.index ?? 0;

  useEffect(() => {
    const neededIndex = lastVirtualRow + prefetchRowBuffer;
    if (hasNextPage && !isFetchingNextPage && neededIndex >= tlds.length) {
      fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    lastVirtualRow,
    prefetchRowBuffer,
    tlds.length,
  ]);

  return (
    <div
      ref={scrollRef}
      className="mt-2 h-[190px] overflow-y-auto rounded-[7px] border border-[#dfe4ec] bg-[#fbfcfd] p-1.5"
    >
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.map((row) => {
          const ext = tlds[row.index];
          return (
            <div
              key={row.key}
              className="absolute left-0 right-0"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              {ext ? (
                <button
                  type="button"
                  className={`flex h-[30px] w-full items-center justify-between rounded-[6px] px-2.5 text-left text-[0.78rem] font-semibold transition-colors ${
                    ext === currentTld
                      ? "bg-[#e8f5ec] text-[#087d36]"
                      : "text-[#1f2937] hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(216,222,232,0.9)]"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {name}.<span className="text-[#087d36]">{ext}</span>
                  </span>
                  {ext === currentTld && (
                    <span className="ml-2 shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.05em]">
                      selected
                    </span>
                  )}
                </button>
              ) : (
                <div className="h-[30px] rounded-[6px] bg-white" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WhyBuilt() {
  return (
    <section className="mt-3 grid min-w-0 items-center gap-6 overflow-hidden rounded-[10px] border border-[#dce2ea] bg-white px-6 py-5 shadow-[0_5px_18px_rgba(15,23,42,0.035)] lg:grid-cols-[340px_1fr]">
      <div className="min-w-0">
        <h2 className="font-serif text-[1.55rem] font-normal leading-none text-black">
          Why I built it
        </h2>
        <p className="mt-4 text-[0.82rem] leading-[1.6] text-[#1f2937]">
          Guessing names is slow.
          <br />I batch-checked the set I wanted to browse.
        </p>
      </div>

      <div className="grid min-w-0 items-center gap-4 md:grid-cols-[minmax(155px,1fr)_auto_minmax(155px,1fr)_auto_minmax(155px,1fr)]">
        <Step icon={Search} n="1" title="guess" text="Think of a name" />
        <span className="hidden text-[1.55rem] text-[#8b94a6] md:block">→</span>
        <Step icon={Sparkles} n="2" title="taken" text="Registrar says taken" danger />
        <span className="hidden text-[1.55rem] text-[#8b94a6] md:block">→</span>
        <Step icon={Check} n="3" title="browse" text="Browse what's open" success />
      </div>

    </section>
  );
}

function Step({
  icon: Icon,
  n,
  title,
  text,
  danger,
  success,
}: {
  icon: typeof Search;
  n: string;
  title: string;
  text: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="grid min-h-[82px] min-w-[155px] grid-cols-[38px_1fr] items-center gap-x-3 rounded-[8px] border border-[#dfe4ec] bg-white px-4 py-3">
      <span
        className={`row-span-2 flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${
          danger
            ? "border-[#ff4040] text-[#ff4040]"
            : success
              ? "border-[#0b873f] text-[#0b873f]"
              : "border-[#111318] text-[#111318]"
        }`}
      >
        <Icon size={24} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 self-end text-[0.86rem] font-bold leading-tight text-black">
        <span className="mr-2">{n}</span>
        <span>{title}</span>
      </span>
      <span className="min-w-0 self-start text-[0.72rem] font-semibold leading-[1.35] text-[#596176]">
        {text}
      </span>
    </div>
  );
}

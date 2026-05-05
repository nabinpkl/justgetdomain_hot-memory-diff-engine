"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Bookmark,
  Box,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import { useShelfData } from "@/hooks/use-shelf-data";
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
                    className="h-[38px] min-w-[66px] cursor-pointer rounded-[7px] border border-[#dfe4ed] bg-white px-5 text-[0.86rem] font-semibold text-black shadow-[0_1px_1px_rgba(14,22,36,0.025)] outline-none transition-all duration-150 hover:-translate-y-px hover:border-[#b8c2d2] hover:bg-[#fbfcfd] hover:shadow-[0_5px_14px_rgba(15,23,42,0.06)] focus-visible:ring-2 focus-visible:ring-[#0b873f]/25"
                  >
                    {filter}
                  </button>
                ))}
                <span className="h-[36px] w-px shrink-0 bg-[#dfe4ed]" />
                {["4 letters", "short", "one-word", "fresh"].map((filter) => (
                  <button
                    key={filter}
                    className="h-[38px] min-w-fit cursor-pointer rounded-[7px] border border-[#dfe4ed] bg-white px-5 text-[0.86rem] font-semibold text-black shadow-[0_1px_1px_rgba(14,22,36,0.025)] outline-none transition-all duration-150 hover:-translate-y-px hover:border-[#b8c2d2] hover:bg-[#fbfcfd] hover:shadow-[0_5px_14px_rgba(15,23,42,0.06)] focus-visible:ring-2 focus-visible:ring-[#0b873f]/25"
                  >
                    {filter}
                  </button>
                ))}
                <button className="ml-auto flex h-[38px] min-w-fit cursor-pointer items-center gap-3 rounded-[7px] border border-[#dfe4ed] bg-white px-5 text-[0.86rem] font-semibold text-black shadow-[0_1px_1px_rgba(14,22,36,0.025)] outline-none transition-all duration-150 hover:-translate-y-px hover:border-[#b8c2d2] hover:bg-[#fbfcfd] hover:shadow-[0_5px_14px_rgba(15,23,42,0.06)] focus-visible:ring-2 focus-visible:ring-[#0b873f]/25">
                  More filters <SlidersHorizontal size={16} aria-hidden />
                </button>
              </div>
            </div>
          </section>

          <DomainWorkbench
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
          />
          <WhyBuilt />
        </main>
      </div>
    </>
  );
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

function DomainWorkbench({
  searchQuery,
  onClearSearch,
}: {
  searchQuery: string;
  onClearSearch: () => void;
}) {
  const [activeShelfId, setActiveShelfId] = useState("all");
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const shortlist = useShortlist();
  const normalizedQuery = searchQuery.trim();
  const isSearching = normalizedQuery.length > 0;
  const activeShelf =
    shelves.find((shelf) => shelf.id === (isSearching ? "all" : activeShelfId)) ?? shelves[0];
  const isWatchlist = activeShelf.id === "watchlist";

  useEffect(() => {
    if (isSearching) setActiveShelfId("all");
  }, [isSearching]);

  const {
    domains: apiDomains,
    total,
    totalCombos,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useShelfData({
    tlds: activeShelf.tlds,
    lengths: activeShelf.lengths,
    categories: activeShelf.categories,
    q: normalizedQuery || undefined,
    seed,
    limit: 18,
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
  const featuredDomain = visibleDomains[0] ?? null;
  const resultCountLabel = isWatchlist
    ? `${shortlist.items.length} saved`
    : isLoading
      ? "Loading"
      : isSearching
        ? `${total.toLocaleString()} results`
        : `${total.toLocaleString()} names`;
  const shelfSearchLabel = isSearching && isLoading ? "Searching" : "Search results";

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
          <button
            type="button"
            onClick={fetchNextPage}
            disabled={isWatchlist || !hasNextPage || isFetchingNextPage}
            className="mt-6 flex h-[43px] w-full items-center justify-center gap-4 rounded-[7px] border border-[#dbe1eb] bg-white text-[0.94rem] font-medium text-[#1f2937] shadow-[0_1px_1px_rgba(14,22,36,0.025)]"
          >
            {isFetchingNextPage ? "Loading" : "Load more"}{" "}
            <span className="text-[1.4rem] leading-none">→</span>
          </button>
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              canFetchMore={!isWatchlist && hasNextPage}
              isFetchingMore={isFetchingNextPage}
              fetchMore={fetchNextPage}
            />
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-[7px] border border-dashed border-[#dfe4ec] text-[0.92rem] font-semibold text-[#687187]">
              {isWatchlist ? "Your watchlist is empty." : "No domains found."}
            </div>
          )}
        </div>

        <DomainDetail domain={featuredDomain} shelfLabel={activeShelf.label} />
      </div>
    </section>
  );
}

function DomainGrid({
  domains,
  total,
  shelfId,
  canFetchMore,
  isFetchingMore,
  fetchMore,
}: {
  domains: { name: string; tld: string }[];
  total: number;
  shelfId: string;
  canFetchMore: boolean;
  isFetchingMore: boolean;
  fetchMore: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      setCols(width >= 900 ? 3 : width >= 600 ? 2 : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(total / cols);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => DOMAIN_CARD_ROW_HEIGHT + DOMAIN_CARD_GAP,
    overscan: 3,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const lastVirtualRow = virtualRows.at(-1)?.index ?? 0;

  useEffect(() => {
    const neededIndex = (lastVirtualRow + 3) * cols;
    if (canFetchMore && !isFetchingMore && neededIndex >= domains.length) {
      fetchMore();
    }
  }, [canFetchMore, cols, domains.length, fetchMore, isFetchingMore, lastVirtualRow]);

  return (
    <div
      ref={scrollRef}
      className="h-[calc(148px*3+16px*2)] overflow-y-auto pr-2"
    >
      <div
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
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
}: {
  name: string;
  tld: string;
  tags: string[];
}) {
  const shortlist = useShortlist();
  const fullDomain = `${name}.${tld}`;
  const saved = shortlist.items.includes(fullDomain);
  const toggleSaved = () => {
    saved ? shortlist.remove(fullDomain) : shortlist.add(fullDomain);
  };

  return (
    <article className="group h-[132px] cursor-pointer rounded-[7px] border border-[#dfe4ec] bg-white p-4 shadow-[0_1px_2px_rgba(14,22,36,0.025)] transition-all duration-150 hover:-translate-y-px hover:border-[#b8c2d2] hover:shadow-[0_8px_20px_rgba(15,23,42,0.07)]">
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
      <div className="mt-3 flex items-center gap-2 text-[0.84rem] text-[#687187]">
        <span className="size-2.5 rounded-full bg-[#0b873f]" /> available
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
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

function DomainDetail({
  domain,
  shelfLabel,
}: {
  domain: { name: string; tld: string } | null;
  shelfLabel: string;
}) {
  const name = domain?.name ?? "count";
  const tld = domain?.tld ?? "space";
  const extensions = [`.${tld}`, ".dev", ".tech", ".ai", ".app", ".xyz", ".io", ".space"];
  const related = [`${name}s.${tld}`, `${name}er.${tld}`, `${name}able.${tld}`, `${name}less.${tld}`];

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
        <button className="mt-3 flex h-9 w-full overflow-hidden rounded-[6px] bg-[#0b873f] text-[0.95rem] font-bold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.16)]">
          <span className="flex flex-1 items-center justify-center">Copy {name}.{tld}</span>
          <span className="flex w-10 items-center justify-center border-l border-white/55">
            <Copy size={17} aria-hidden />
          </span>
        </button>

        <p className="mt-4 text-[0.76rem] font-bold uppercase tracking-[0.08em] text-[#71798c]">
          {shelfLabel}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {extensions.map((ext, index) => (
            <span
              key={ext}
              className={`rounded-[6px] border px-2 py-1.5 text-center text-[0.7rem] font-bold ${
                index === 0
                  ? "border-[#b7d9bf] bg-[#e8f5ec] text-[#087d36]"
                  : "border-[#dde3ed] bg-white text-[#566077]"
              }`}
            >
              {ext}
            </span>
          ))}
        </div>

        <p className="mt-4 text-[0.76rem] font-bold uppercase tracking-[0.08em] text-[#71798c]">
          Related names
        </p>
        <div className="mt-2 space-y-1.5">
          {related.map((name) => (
            <Link
              key={name}
              href="/"
              className="flex items-center justify-between text-[0.8rem] font-semibold text-[#1f2937]"
            >
              <span>
                {name.split(".")[0]}.<span className="text-[#087d36]">{tld}</span>
              </span>
              <ExternalLink size={14} strokeWidth={1.8} className="text-[#697286]" />
            </Link>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-4 border-t border-[#dfe4ec] pt-2 text-[0.62rem] font-semibold text-[#7a8395]">
          <span>Length</span>
          <span>5</span>
          <span>Checked&nbsp;&nbsp;<b className="text-[#1f2937]">11h ago</b></span>
          <span>Source&nbsp;&nbsp;<b className="text-[#1f2937]">Live snapshot</b></span>
        </div>
      </section>
    </aside>
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

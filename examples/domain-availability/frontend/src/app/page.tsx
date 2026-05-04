"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bookmark,
  Box,
  Check,
  CircleDot,
  Clock3,
  Code2,
  Copy,
  Database,
  Droplet,
  ExternalLink,
  Layers3,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Zap,
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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen overflow-x-clip bg-[#fbfbfa] text-[#111318] font-sans font-medium">
        <main className="mx-auto w-full max-w-[1500px] px-[clamp(20px,3vw,48px)] pb-6 pt-[46px]">
          <section className="grid grid-cols-1 items-start gap-x-10 gap-y-7 lg:grid-cols-[500px_1fr]">
            <div className="pl-3 pt-2">
              <h1 className="font-serif text-[clamp(2.1rem,2.75vw,2.68rem)] font-normal leading-[1.05] tracking-[0] text-black">
                Browse names that are still{" "}
                <span className="text-[#087d36]">open.</span>
              </h1>
              <p className="mt-4 text-[clamp(1.02rem,1.15vw,1.22rem)] leading-[1.35] text-[#687187]">
                Short domains checked across 1,012 TLDs.
              </p>
            </div>

            <div className="space-y-[18px]">
              <div className="relative h-[54px] rounded-[8px] border border-[#d8dee8] bg-white shadow-[0_1px_2px_rgba(14,22,36,0.04)]">
                <Search
                  size={25}
                  strokeWidth={1.8}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-[#111318]"
                  aria-hidden
                />
                <input
                  aria-label="Search domains"
                  placeholder="try prism, vault, signal, .dev"
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
                    className="h-[38px] min-w-[66px] rounded-[7px] border border-[#dfe4ed] bg-white px-5 text-[0.86rem] font-semibold text-black shadow-[0_1px_1px_rgba(14,22,36,0.025)]"
                  >
                    {filter}
                  </button>
                ))}
                <span className="h-[36px] w-px shrink-0 bg-[#dfe4ed]" />
                {["4 letters", "short", "one-word", "fresh"].map((filter) => (
                  <button
                    key={filter}
                    className="h-[38px] min-w-fit rounded-[7px] border border-[#dfe4ed] bg-white px-5 text-[0.86rem] font-semibold text-black shadow-[0_1px_1px_rgba(14,22,36,0.025)]"
                  >
                    {filter}
                  </button>
                ))}
                <button className="ml-auto flex h-[38px] min-w-fit items-center gap-3 rounded-[7px] border border-[#dfe4ed] bg-white px-5 text-[0.86rem] font-semibold text-black shadow-[0_1px_1px_rgba(14,22,36,0.025)]">
                  More filters <SlidersHorizontal size={16} aria-hidden />
                </button>
              </div>
            </div>
          </section>

          <DomainWorkbench />
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

const statItems = [
  { icon: CircleDot, label: "6,834,492 combos", color: "text-[#0a873f]" },
  { icon: Database, label: "1,012 TLDs" },
  { icon: Zap, label: "p99 858 μs" },
  { icon: Clock3, label: "updated 11h ago" },
  { icon: RefreshCw, label: "" },
];

function DomainWorkbench() {
  const [activeShelfId, setActiveShelfId] = useState("all");
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const shortlist = useShortlist();
  const activeShelf = shelves.find((shelf) => shelf.id === activeShelfId) ?? shelves[0];
  const isWatchlist = activeShelf.id === "watchlist";
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

  return (
    <section className="mt-5 overflow-hidden rounded-[10px] border border-[#dce2ea] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
      <div className="grid min-h-[50px] grid-cols-1 border-b border-[#dfe4ec] lg:grid-cols-[292px_1fr]">
        <div className="flex items-center gap-7 px-5 text-[0.92rem] font-semibold text-[#697286]">
          <Tab icon={Layers3} label="Explore" active />
          <Tab icon={Box} label="Short" />
          <Tab icon={Code2} label=".dev" />
          <Tab icon={Droplet} label="Tech" />
          <Tab icon={Sparkles} label="AI" dot />
        </div>
        <div className="hidden items-center justify-end gap-6 px-6 text-[0.89rem] font-semibold text-[#596176] lg:flex">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={`${item.label}-${index}`} className="flex items-center gap-2.5">
                <Icon
                  size={18}
                  strokeWidth={1.9}
                  className={item.color ?? "text-[#6a7285]"}
                  fill={index === 0 ? "currentColor" : "none"}
                  aria-hidden
                />
                {item.label && <span>{item.label}</span>}
                {index < statItems.length - 1 && (
                  <span className="ml-3 h-5 w-px bg-[#dfe4ec]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[292px_1fr_330px]">
        <aside className="border-b border-[#dfe4ec] px-4 py-5 lg:border-b-0 lg:border-r">
          <p className="mb-4 px-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#71798c]">
            Shelves
          </p>
          <div className="space-y-0.5">
            {shelves.map((shelf) => (
              <ShelfItem
                key={shelf.label}
                {...shelf}
                active={shelf.id === activeShelfId}
                count={
                  shelf.id === activeShelfId && !isWatchlist && totalCombos > 0
                    ? formatCompact(totalCombos)
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

        <div className="p-5">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[1.05rem] font-bold text-black">{activeShelf.label}</h2>
            <span className="text-[0.78rem] font-semibold text-[#687187]">
              {isWatchlist
                ? `${shortlist.items.length} saved`
                : isLoading
                  ? "Loading"
                  : `${total.toLocaleString()} names`}
            </span>
          </div>
          {isLoading && !isWatchlist ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[116px] rounded-[7px] border border-[#dfe4ec] bg-[#f7f8fa]"
                />
              ))}
            </div>
          ) : visibleDomains.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleDomains.map((domain) => (
                <DomainCard
                  key={`${domain.name}.${domain.tld}`}
                  {...domain}
                  tags={tagsForDomain(domain, activeShelf.id)}
                />
              ))}
            </div>
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

function Tab({
  icon: Icon,
  label,
  active,
  dot,
}: {
  icon: typeof Layers3;
  label: string;
  active?: boolean;
  dot?: boolean;
}) {
  return (
    <button
      className={`relative flex h-[52px] items-center gap-2.5 text-[0.91rem] ${
        active ? "text-[#0a7839]" : "text-[#687187]"
      }`}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden />
      {label}
      {dot && <span className="size-2 rounded-full bg-[#ffa51f]" />}
      {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#0b823d]" />}
    </button>
  );
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
      className={`flex h-[35px] w-full items-center gap-3 rounded-[7px] px-2.5 text-left text-[0.95rem] ${
        active
          ? "bg-[#e8f5ec] font-semibold text-[#087d36]"
          : "bg-transparent font-medium text-[#334155]"
      }`}
    >
      <span className={`flex size-[28px] items-center justify-center rounded-[6px] ${colorClass}`}>
        {typeof Icon === "string" ? (
          <span className="text-[0.82rem] font-bold">{Icon}</span>
        ) : (
          <Icon size={17} strokeWidth={1.8} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <span className="text-[0.89rem] font-medium text-[#566077]">{count}</span>
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
    <article className="min-h-[116px] rounded-[7px] border border-[#dfe4ec] bg-white p-4 shadow-[0_1px_2px_rgba(14,22,36,0.025)]">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[1.33rem] font-bold leading-none tracking-[0] text-black">
          {name}.<span className="text-[#087d36]">{tld}</span>
        </h2>
        <button
          type="button"
          onClick={toggleSaved}
          aria-label={saved ? `Remove ${fullDomain} from watchlist` : `Save ${fullDomain} to watchlist`}
          className="rounded-[6px] p-1 text-[#697286] transition-colors hover:bg-[#f2f5f9] hover:text-[#087d36]"
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
        className="float-right -mt-5 text-[#697286]"
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
              href="/explore"
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
    <section className="mt-3 grid min-w-0 items-center gap-5 overflow-hidden rounded-[10px] border border-[#dce2ea] bg-white px-6 py-5 shadow-[0_5px_18px_rgba(15,23,42,0.035)] xl:grid-cols-[270px_minmax(480px,1fr)_minmax(190px,230px)_minmax(190px,230px)]">
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

      <div className="flex min-w-0 items-center gap-4 border-t border-[#dfe4ec] pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <Database size={32} strokeWidth={1.6} className="shrink-0 text-[#2f3a4c]" aria-hidden />
        <p className="min-w-0 text-[0.8rem] leading-[1.45] text-[#334155]">
          Built on hot-index
          <br />+ streaming-set-diff
        </p>
      </div>

      <Link
        href="https://github.com/nabinpkl/justgetdomain.com"
        className="flex min-w-0 items-center gap-4 border-t border-[#dfe4ec] pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[32px] shrink-0 fill-black text-black"
          aria-hidden
        >
          <path d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.58.11.79-.25.79-.56v-2.14c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.39-5.25 5.67.42.36.78 1.06.78 2.14v3.14c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z" />
        </svg>
        <span className="min-w-0 text-[0.8rem] leading-[1.45] text-[#334155]">
          <b className="text-black">Source on GitHub</b>{" "}
          <ExternalLink size={13} className="inline text-[#697286]" aria-hidden />
          <br />
          <span className="block truncate font-semibold text-[#087d36]">
            github.com/justgetdomain
          </span>
        </span>
      </Link>
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

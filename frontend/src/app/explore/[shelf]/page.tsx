"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { DomainPill } from "@/components/domain/domain-pill";
import { DomainModal } from "@/components/domain/domain-modal";
import { SavedBar } from "@/components/domain/saved-bar";
import { SHELF_CONFIGS, type ShelfConfig } from "@/components/domain/shelf-configs";
import { useShortlist } from "@/stores/use-shortlist";

type SearchResult = {
  name: string;
  tlds: string[];
  length: number;
  match_count: number;
};

type SearchResponse = {
  total: number;
  total_combos: number;
  results: SearchResult[];
};

type Domain = { name: string; tld: string };

const PAGE_SIZE = 200;
const ROW_HEIGHT = 70;
const GAP = 10;
const MIN_ITEM_WIDTH = 160;
const MIN_COLS = 2;
const MAX_COLS = 5;
const PREFETCH_ROWS = 6;

function buildSearchUrl(config: ShelfConfig, seed: number, offset: number) {
  const params = new URLSearchParams();
  if (config.tlds) params.set("tlds", config.tlds);
  if (config.lengths) params.set("lengths", config.lengths);
  if (config.categories) params.set("categories", config.categories);
  params.set("sort", "random");
  params.set("seed", String(seed));
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(offset));
  return `/api/search?${params.toString()}`;
}

function toDomain(r: SearchResult): Domain {
  return {
    name: r.name,
    tld: r.tlds[0]?.replace(/^\./, "") ?? "com",
  };
}

function useColumnCount(ref: React.RefObject<HTMLElement | null>): number {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const next = Math.max(
        MIN_COLS,
        Math.min(MAX_COLS, Math.floor((w + GAP) / (MIN_ITEM_WIDTH + GAP))),
      );
      setCols(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

export default function ShelfPage({
  params,
}: {
  params: Promise<{ shelf: string }>;
}) {
  const { shelf } = use(params);
  const config = SHELF_CONFIGS.find((c) => c.id === shelf);
  if (!config) notFound();

  const shortlist = useShortlist();
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [active, setActive] = useState<Domain | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const cols = useColumnCount(gridRef);

  const query = useInfiniteQuery({
    queryKey: ["shelf", config.id, seed],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const res = await fetch(
        buildSearchUrl(config, seed, pageParam as number),
        { signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as SearchResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
  });

  const domains = useMemo<Domain[]>(
    () => query.data?.pages.flatMap((p) => p.results.map(toDomain)) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const totalCombos = query.data?.pages[0]?.total_combos ?? 0;
  const loadedCount = domains.length;
  const isInitialLoading = query.isPending;

  const rowCount = Math.ceil(total / cols);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 4,
    scrollMargin: gridRef.current?.offsetTop ?? 0,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const lastVisibleRow = virtualRows.length
    ? virtualRows[virtualRows.length - 1].index
    : 0;

  // Fetch next page when we're within PREFETCH_ROWS rows of the loaded end.
  useEffect(() => {
    const neededIndex = (lastVisibleRow + PREFETCH_ROWS) * cols;
    if (
      query.hasNextPage &&
      !query.isFetchingNextPage &&
      neededIndex >= loadedCount
    ) {
      query.fetchNextPage();
    }
  }, [lastVisibleRow, cols, loadedCount, query]);

  return (
    <div
      className="min-h-screen bg-jgd-bg text-jgd-text"
      style={{ paddingBottom: shortlist.items.length > 0 ? "70px" : "0" }}
    >
      {/* Header */}
      <section className="px-6 sm:px-10 pt-10 pb-8 max-w-[1400px] mx-auto">
        <Link
          href="/explore"
          className="jgd-fade-up inline-flex items-center gap-1.5 text-[0.78rem] font-mono text-jgd-muted hover:text-jgd-dim transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          All Categories
        </Link>

        <h1 className="jgd-fade-up [animation-delay:0.05s] font-serif text-[clamp(1.8rem,4vw,2.75rem)] font-normal italic tracking-[-0.02em] leading-[1.1] text-jgd-text mb-3">
          {config.title}
        </h1>
        <p className="jgd-fade-up [animation-delay:0.1s] text-[1rem] text-jgd-dim leading-[1.6] max-w-[560px] mb-3">
          {config.description}
        </p>
        <div className="jgd-fade-up [animation-delay:0.15s] text-[0.82rem] font-mono text-jgd-muted">
          {isInitialLoading
            ? "\u2026"
            : `${totalCombos.toLocaleString()} available combos · ${total.toLocaleString()} names`}
        </div>
      </section>

      {/* Virtualized grid */}
      <section className="px-6 sm:px-10 max-w-[1400px] mx-auto">
        <div ref={gridRef}>
          {isInitialLoading ? (
            <div
              className="grid gap-2.5"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: cols * 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[70px] rounded-lg bg-jgd-surface/40 animate-pulse"
                />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="py-16 text-center text-jgd-muted font-mono text-[0.88rem]">
              No domains available in this shelf.
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                width: "100%",
                height: virtualizer.getTotalSize(),
              }}
            >
              {virtualRows.map((vRow) => {
                const rowStart = vRow.index * cols;
                const rowItems = Array.from({ length: cols }, (_, i) => {
                  const idx = rowStart + i;
                  if (idx >= total) return null;
                  return { idx, domain: domains[idx] };
                });
                return (
                  <div
                    key={vRow.key}
                    data-index={vRow.index}
                    ref={virtualizer.measureElement}
                    className="grid gap-2.5"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${
                        vRow.start - virtualizer.options.scrollMargin
                      }px)`,
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    }}
                  >
                    {rowItems.map((cell, i) => {
                      if (!cell) return <div key={i} />;
                      const d = cell.domain;
                      if (!d) {
                        return (
                          <div
                            key={cell.idx}
                            className="h-[70px] rounded-lg bg-jgd-surface/40 animate-pulse"
                          />
                        );
                      }
                      return (
                        <DomainPill
                          key={`${d.name}.${d.tld}`}
                          name={d.name}
                          tld={d.tld}
                          showMeta
                          fullWidth
                          onClick={() => setActive({ name: d.name, tld: d.tld })}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="h-16" />

      <DomainModal
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        name={active?.name ?? null}
        heroTld={active?.tld ?? null}
      />

      <SavedBar />
    </div>
  );
}

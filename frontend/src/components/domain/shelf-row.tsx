"use client";

import { DomainPill } from "./domain-pill";
import { HorizontalScroll } from "./horizontal-scroll";
import { useShelfData } from "@/hooks/use-shelf-data";
import { useShortlist } from "@/stores/use-shortlist";
import type { ShelfConfig } from "./shelf-configs";

type ShelfRowProps = {
  config: ShelfConfig;
};

function ShelfSkeleton() {
  return (
    <div className="flex gap-2.5 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 h-12 w-36 rounded-lg bg-jgd-surface/40 animate-pulse"
        />
      ))}
    </div>
  );
}

export function ShelfRow({ config }: ShelfRowProps) {
  const { domains, total, isLoading } = useShelfData({
    tlds: config.tlds,
    lengths: config.lengths,
    categories: config.categories,
    seed: config.seed,
    limit: 20,
  });

  const shortlist = useShortlist();
  const remaining = total - domains.length;

  if (!isLoading && domains.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-1 px-6 sm:px-10">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="text-[1rem] font-semibold text-jgd-text">
            {config.title}
          </h3>
          <span className="text-[0.72rem] text-jgd-muted font-mono">
            {isLoading ? "\u2026" : `${total.toLocaleString()} available`}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[0.85rem] text-jgd-dim leading-[1.5] mb-3 px-6 sm:px-10">
        {config.description}
      </p>

      {/* Scrollable domain cards */}
      {isLoading ? (
        <div className="px-6 sm:px-10">
          <ShelfSkeleton />
        </div>
      ) : (
        <div className="px-6 sm:px-10">
          <HorizontalScroll showArrows>
            {domains.map((d) => {
              const fullDomain = `${d.name}.${d.tld}`;
              const isSaved = shortlist.items.includes(fullDomain);
              return (
                <DomainPill
                  key={fullDomain}
                  name={d.name}
                  tld={d.tld}
                  saved={isSaved}
                  showMeta
                  onToggle={() =>
                    isSaved
                      ? shortlist.remove(fullDomain)
                      : shortlist.add(fullDomain)
                  }
                />
              );
            })}
            {remaining > 0 && (
              <div className="shrink-0 px-5 py-2.5 rounded-lg border border-dashed border-jgd-border/50 flex items-center text-[0.78rem] text-jgd-accent/50 font-mono whitespace-nowrap">
                +{remaining.toLocaleString()} more
              </div>
            )}
          </HorizontalScroll>
        </div>
      )}
    </div>
  );
}

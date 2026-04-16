"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DomainPill } from "./domain-pill";
import { DomainModal } from "./domain-modal";
import { HorizontalScroll } from "./horizontal-scroll";
import { useShelfData } from "@/hooks/use-shelf-data";
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
  // Fresh seed per mount = new domains on every page refresh.
  // Lazy initializer keeps the seed stable across re-renders.
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const { domains, total, totalCombos, isLoading } = useShelfData({
    tlds: config.tlds,
    lengths: config.lengths,
    categories: config.categories,
    seed,
    limit: 20,
  });

  const remaining = total - domains.length;
  const [active, setActive] = useState<{ name: string; tld: string } | null>(
    null,
  );

  if (!isLoading && domains.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-1 px-6 sm:px-10">
        <div className="flex items-baseline gap-3 flex-wrap">
          <Link
            href={`/explore/${config.id}`}
            className="group inline-flex items-center gap-1.5 text-[1rem] font-semibold text-jgd-text hover:text-jgd-accent transition-colors"
          >
            <h3>{config.title}</h3>
            <ArrowUpRight
              size={14}
              className="text-jgd-muted group-hover:text-jgd-accent transition-all opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
            />
          </Link>
          <span className="text-[0.72rem] text-jgd-muted font-mono">
            {isLoading
              ? "\u2026"
              : `${totalCombos.toLocaleString()} available combos`}
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
            {domains.map((d) => (
              <DomainPill
                key={`${d.name}.${d.tld}`}
                name={d.name}
                tld={d.tld}
                showMeta
                onClick={() => setActive({ name: d.name, tld: d.tld })}
              />
            ))}
            {remaining > 0 && (
              <div className="shrink-0 px-5 py-2.5 rounded-lg border border-dashed border-jgd-border/50 flex items-center text-[0.78rem] text-jgd-accent/50 font-mono whitespace-nowrap">
                +{remaining.toLocaleString()} more
              </div>
            )}
          </HorizontalScroll>
        </div>
      )}

      <DomainModal
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        name={active?.name ?? null}
        heroTld={active?.tld ?? null}
      />
    </div>
  );
}

"use client";

import Link from "next/link";

type Domain = { name: string; tld: string };

type MiniShelfProps = {
  shelfId: string;
  title: string;
  total: number;
  totalCombos: number;
  domains: Domain[];
  isLoading: boolean;
};

function ShelfSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 h-10 w-28 rounded-sm bg-jgd-surface/40 animate-pulse"
        />
      ))}
    </div>
  );
}

export function MiniShelf({
  shelfId,
  title,
  total,
  totalCombos,
  domains,
  isLoading,
}: MiniShelfProps) {
  if (!isLoading && domains.length === 0) return null;

  return (
    <div className="mb-7">
      <div className="flex items-baseline gap-2.5 mb-2.5">
        <span className="text-[0.82rem] font-semibold text-jgd-text">
          {title}
        </span>
        <span className="text-[0.68rem] text-jgd-muted font-mono">
          {isLoading
            ? "\u2026"
            : `${totalCombos.toLocaleString()} combos across ${total.toLocaleString()} names`}
        </span>
      </div>

      {isLoading ? (
        <ShelfSkeleton />
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-jgd-bg to-transparent" />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {domains.map((d) => (
              <div
                key={`${d.name}.${d.tld}`}
                className="shrink-0 px-4 py-2.5 rounded-sm bg-jgd-surface/40 border border-jgd-border text-[0.82rem] text-jgd-dim font-mono"
              >
                {d.name}
                <span className="text-jgd-accent/55">.{d.tld}</span>
              </div>
            ))}
            <Link
              href="/"
              className="shrink-0 px-4 py-2.5 rounded-sm border border-dashed border-jgd-accent/40 flex items-center text-[0.75rem] text-jgd-accent/80 font-mono hover:bg-jgd-accent-dim hover:border-jgd-accent/70 transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

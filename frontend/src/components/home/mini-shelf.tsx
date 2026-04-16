"use client";

type Domain = { name: string; tld: string };

type MiniShelfProps = {
  title: string;
  total: number;
  domains: Domain[];
  isLoading: boolean;
};

function ShelfSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 h-10 w-28 rounded-md bg-jgd-surface/40 animate-pulse"
        />
      ))}
    </div>
  );
}

export function MiniShelf({ title, total, domains, isLoading }: MiniShelfProps) {
  if (!isLoading && domains.length === 0) return null;

  const remaining = total - domains.length;

  return (
    <div className="mb-7">
      <div className="flex items-baseline gap-2.5 mb-2.5">
        <span className="text-[0.82rem] font-semibold text-jgd-text">
          {title}
        </span>
        <span className="text-[0.68rem] text-jgd-muted">
          {isLoading ? "\u2026" : `${total.toLocaleString()} available`}
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
              className="shrink-0 px-4 py-2.5 rounded-md bg-jgd-surface/40 border border-jgd-border text-[0.82rem] text-jgd-dim font-mono"
            >
              {d.name}
              <span className="text-jgd-accent/55">.{d.tld}</span>
            </div>
          ))}
          {remaining > 0 && (
            <div className="shrink-0 px-4 py-2.5 rounded-md border border-dashed border-jgd-border/50 flex items-center text-[0.75rem] text-jgd-accent/50 font-mono">
              +{remaining.toLocaleString()} more &rarr;
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

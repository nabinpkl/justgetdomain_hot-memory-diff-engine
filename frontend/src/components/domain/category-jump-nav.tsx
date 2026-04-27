"use client";

import type { ShelfConfig } from "./shelf-configs";

export function CategoryJumpNav({ shelves }: { shelves: ShelfConfig[] }) {
  const vibes = shelves.filter((s) => s.group === "vibe");
  if (vibes.length === 0) return null;

  return (
    <aside
      aria-label="Jump to category"
      className="bg-jgd-surface/40 border border-jgd-border rounded-sm p-4"
    >
      <p className="text-[0.65rem] uppercase tracking-[2px] text-jgd-muted mb-3">
        Jump to category
      </p>
      <nav className="flex flex-col">
        {vibes.map((config) => (
          <a
            key={config.id}
            href={`#shelf-${config.id}`}
            className="px-2 py-1.5 rounded-sm text-[0.82rem] text-jgd-dim hover:text-jgd-text hover:bg-jgd-surface/60 transition-colors"
          >
            {config.title}
          </a>
        ))}
      </nav>
    </aside>
  );
}

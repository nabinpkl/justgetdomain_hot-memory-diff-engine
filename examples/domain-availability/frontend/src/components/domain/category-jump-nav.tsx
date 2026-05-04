"use client";

import type { ShelfConfig } from "./shelf-configs";

export function CategoryJumpNav({ shelves }: { shelves: ShelfConfig[] }) {
  if (shelves.length === 0) return null;

  return (
    <nav aria-label="Jump to category" className="flex items-center gap-1 flex-wrap">
      <span className="text-[0.65rem] uppercase tracking-[1.5px] text-jgd-muted mr-1 shrink-0">
        Jump to
      </span>
      {shelves.map((config) => (
        <a
          key={config.id}
          href={`#shelf-${config.id}`}
          className="px-2.5 py-1 rounded-full text-[0.72rem] font-mono text-jgd-dim border border-jgd-border hover:text-jgd-text hover:border-jgd-text/30 transition-colors whitespace-nowrap"
        >
          {config.title}
        </a>
      ))}
    </nav>
  );
}

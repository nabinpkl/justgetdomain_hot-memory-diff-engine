"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { MAX_SHORTLIST, useShortlist } from "@/stores/use-shortlist";
import { useFilterState } from "@/lib/starfield/filter-state";
import { FiltersTrigger } from "./filters-trigger";

export function SkyCommandBar({ total }: { total: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery } = useFilterState();

  const [mounted, setMounted] = useState(false);
  const items = useShortlist((s) => s.items);
  const remove = useShortlist((s) => s.remove);
  useEffect(() => setMounted(true), []);

  const displayItems = mounted ? items : [];
  const count = displayItems.length;

  return (
    <div className="sticky top-14 z-40 backdrop-blur-[12px] bg-jgd-surface/70 border-y border-jgd-border">
      <div className="flex items-center gap-3 px-6 sm:px-8 h-12">
        <div
          className="shrink-0 w-[180px] sm:w-[260px] flex items-center gap-2 bg-jgd-bg/40 border border-jgd-border rounded-md h-8 px-3 cursor-text transition-colors focus-within:border-jgd-accent-mid"
          onClick={() => inputRef.current?.focus()}
        >
          <Search size={13} className="text-jgd-dim shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter by text"
            aria-label="Filter the sky by text"
            className="flex-1 min-w-0 bg-transparent outline-none text-[0.85rem] text-jgd-text placeholder:opacity-50 font-sans caret-jgd-accent normal-case tracking-normal"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="text-jgd-dim hover:text-jgd-text transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <FiltersTrigger total={total} />

        <div className="hidden sm:block shrink-0 w-px h-6 bg-jgd-border" aria-hidden />

        <div className="flex-1 min-w-0 flex items-center">
          {count === 0 ? (
            <span className="hidden sm:inline text-[0.7rem] uppercase tracking-[2.5px] text-jgd-dim whitespace-nowrap truncate">
              Click a star to save it
            </span>
          ) : (
            <ul className="flex items-center gap-1.5 overflow-x-auto min-w-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {displayItems.map((domain) => (
                <li key={domain} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => remove(domain)}
                    aria-label={`Remove ${domain} from shortlist`}
                    className="group flex items-center gap-1 h-7 px-2.5 rounded-md border border-jgd-border bg-jgd-bg/40 text-[0.78rem] font-mono text-jgd-text hover:border-jgd-accent-mid hover:text-jgd-accent transition-colors cursor-pointer normal-case tracking-normal"
                  >
                    <span>{domain}</span>
                    <X
                      size={11}
                      className="text-jgd-dim group-hover:text-jgd-accent"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {count > 0 && (
          <span className="shrink-0 text-[0.7rem] tracking-[1.5px] tabular-nums text-jgd-dim">
            {count}/{MAX_SHORTLIST}
          </span>
        )}
      </div>
    </div>
  );
}

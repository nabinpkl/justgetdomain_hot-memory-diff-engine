"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function TldDropdown({
  allTlds,
  popularTlds,
  activeTlds,
  onToggleTld,
}: {
  allTlds: string[];
  popularTlds: string[];
  activeTlds: Set<string>;
  onToggleTld: (tld: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const popularSet = new Set(popularTlds);
  const longTail = allTlds.filter((t) => !popularSet.has(t));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = search
    ? longTail.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : longTail;

  const longTailSelectedCount = [...activeTlds].filter((t) => !popularSet.has(t)).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((p) => !p);
          setSearch("");
        }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-[0.76rem] font-sans transition-all border cursor-pointer",
          open || longTailSelectedCount > 0
            ? "bg-jgd-accent-dim text-jgd-accent border-jgd-accent-mid"
            : "bg-transparent text-jgd-dim border-jgd-border hover:border-jgd-muted"
        )}
      >
        <span>
          {longTailSelectedCount > 0
            ? `${longTailSelectedCount} more selected`
            : `+${longTail.length.toLocaleString()} more`}
        </span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-sm border border-jgd-border bg-jgd-bg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-jgd-border">
            <Search size={12} className="text-jgd-dim shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter all extensions..."
              className="flex-1 bg-transparent outline-none text-[0.76rem] placeholder:opacity-40 text-jgd-text font-sans"
              spellCheck={false}
            />
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
            {filtered.map((tld) => {
              const active = activeTlds.has(tld);
              return (
                <button
                  key={tld}
                  type="button"
                  onClick={() => onToggleTld(tld)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[0.76rem] font-sans transition-colors cursor-pointer",
                    active
                      ? "bg-jgd-accent-dim text-jgd-accent"
                      : "text-jgd-dim hover:bg-jgd-surface/50 hover:text-jgd-text"
                  )}
                >
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                      active ? "bg-jgd-accent border-jgd-accent" : "border-jgd-border"
                    )}
                  >
                    {active && <Check size={10} className="text-jgd-bg" />}
                  </span>
                  {tld}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-2.5 py-3 text-[0.72rem] text-jgd-dim text-center">
                No extensions match
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

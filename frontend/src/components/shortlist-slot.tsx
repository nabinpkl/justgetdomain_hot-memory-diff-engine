"use client";

import { useEffect, useState } from "react";
import { Copy, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_SHORTLIST, useShortlist } from "@/stores/use-shortlist";

export function ShortlistSlot() {
  const [mounted, setMounted] = useState(false);
  const items = useShortlist((s) => s.items);
  const remove = useShortlist((s) => s.remove);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  const count = mounted ? items.length : 0;
  const displayItems = mounted ? items : [];

  const copyAll = async () => {
    if (displayItems.length === 0) return;
    try {
      await navigator.clipboard.writeText(displayItems.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — silently ignore
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Shortlist, ${count} of ${MAX_SHORTLIST} saved`}
        className="hidden sm:flex items-center gap-2 h-7 px-2 rounded-md border border-jgd-border bg-jgd-surface/60 text-jgd-dim cursor-pointer hover:text-jgd-accent hover:border-jgd-accent-mid transition-colors"
      >
        <span className="flex gap-[2px]" aria-hidden>
          {Array.from({ length: MAX_SHORTLIST }).map((_, i) => (
            <span
              key={i}
              className={
                "block w-[5px] h-[5px] rounded-[1px] " +
                (i < count ? "bg-jgd-accent" : "bg-jgd-border")
              }
            />
          ))}
        </span>
        <span className="text-[0.7rem] tracking-[1.5px] tabular-nums">
          {count}/{MAX_SHORTLIST}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[280px] p-0 bg-jgd-surface border-jgd-border"
      >
        {displayItems.length === 0 ? (
          <div className="px-4 py-5 text-[0.8rem] text-jgd-dim leading-[1.5] normal-case tracking-normal">
            Click any star to save it here. Up to {MAX_SHORTLIST} picks.
          </div>
        ) : (
          <>
            <ul className="max-h-[280px] overflow-y-auto">
              {displayItems.map((domain) => (
                <li
                  key={domain}
                  className="flex items-center justify-between px-3 py-2 border-b border-jgd-border last:border-b-0"
                >
                  <span className="text-[0.88rem] text-jgd-text font-mono normal-case tracking-normal">
                    {domain}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(domain)}
                    aria-label={`Remove ${domain}`}
                    className="text-jgd-dim hover:text-jgd-accent cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-3 py-2 flex items-center justify-between border-t border-jgd-border">
              <span className="text-[0.7rem] text-jgd-dim tracking-[1.5px] uppercase tabular-nums">
                {count}/{MAX_SHORTLIST}
              </span>
              <button
                type="button"
                onClick={copyAll}
                className="flex items-center gap-1 text-[0.75rem] text-jgd-accent hover:opacity-80 cursor-pointer normal-case tracking-normal"
              >
                <Copy size={12} />
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFilterState } from "@/lib/starfield/filter-state";
import { SkyFilters } from "./sky-filters";

export function FiltersTrigger({ total }: { total: number }) {
  const [open, setOpen] = useState(false);
  const { activeFacetCount } = useFilterState();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Filter domains"
        className="shrink-0 inline-flex items-center gap-2 h-8 px-2.5 rounded-sm border border-jgd-border bg-jgd-bg/40 text-[0.76rem] text-jgd-dim hover:text-jgd-accent hover:border-jgd-accent-mid transition-colors cursor-pointer normal-case tracking-normal"
      >
        <SlidersHorizontal size={13} aria-hidden />
        <span>
          Filters{activeFacetCount > 0 ? ` (${activeFacetCount})` : ""}
        </span>
        <span className="text-jgd-muted">·</span>
        <span className="tabular-nums text-jgd-text">
          {total.toLocaleString()}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(92vw,380px)] p-4 bg-jgd-surface border-jgd-border"
      >
        <SkyFilters onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

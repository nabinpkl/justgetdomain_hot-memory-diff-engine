"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DomainEntry, REGISTRARS } from "./domain-data";

export function DomainTile({
  domain,
  index,
  activeTlds,
  isExpanded,
  onToggle,
}: {
  domain: DomainEntry;
  index: number;
  activeTlds?: Set<string>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tlds =
    activeTlds && activeTlds.size > 0
      ? domain.tlds.filter((t) => activeTlds.has(t))
      : domain.tlds;

  return (
    <div
      className={cn(
        "jgd-tile-in flex flex-col cursor-pointer transition-colors group px-5 pt-5 pb-4 border-b border-r border-jgd-border",
        isExpanded ? "bg-[oklch(0.22_0.01_142)]" : "bg-jgd-bg"
      )}
      style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
      onClick={onToggle}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          className={cn(
            "font-serif text-2xl font-normal tracking-[-0.5px] transition-colors",
            isExpanded ? "text-jgd-accent" : "text-jgd-text"
          )}
        >
          {domain.name}
        </h2>
        <span className="text-[0.7rem] uppercase tracking-[1px] shrink-0 text-jgd-dim">
          {domain.length}L
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {tlds.map((tld) => (
          <span
            key={tld}
            className="text-[0.74rem] px-2 py-0.5 rounded-sm bg-jgd-accent-dim text-jgd-accent font-sans"
          >
            {tld}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[0.72rem] uppercase tracking-[1.5px] text-jgd-dim">
        {tlds.length} extension{tlds.length !== 1 ? "s" : ""} available
      </p>

      {isExpanded && (
        <div className="mt-4 pt-4 flex flex-col gap-2 border-t border-jgd-accent/12">
          <p className="text-[0.7rem] uppercase tracking-[2px] mb-1 text-jgd-dim">
            Register at
          </p>
          {REGISTRARS.map((reg) => (
            <a
              key={reg.name}
              href={`${reg.url}${domain.name}${tlds[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between text-[0.76rem] px-3 py-2 rounded transition-all text-jgd-text bg-jgd-accent/4 border border-jgd-accent/8 hover:bg-jgd-accent/10 hover:border-jgd-accent/20"
            >
              {reg.name}
              <ExternalLink size={12} className="text-jgd-dim" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

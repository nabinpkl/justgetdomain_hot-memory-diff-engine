"use client";

import { Star } from "lucide-react";

type DomainPillProps = {
  name: string;
  tld: string;
  saved?: boolean;
  onToggle?: () => void;
  showMeta?: boolean;
};

export function DomainPill({
  name,
  tld,
  saved,
  onToggle,
  showMeta,
}: DomainPillProps) {
  const interactive = !!onToggle;

  const content = (
    <>
      <div className="flex items-center gap-2 w-full">
        <span className="font-mono text-jgd-dim whitespace-nowrap">
          {name}
          <span className={saved ? "text-jgd-accent/70" : "text-jgd-accent/55"}>
            .{tld}
          </span>
        </span>
        {interactive && (
          <Star
            size={13}
            className={`ml-auto shrink-0 transition-colors ${
              saved
                ? "fill-jgd-accent text-jgd-accent"
                : "fill-none text-jgd-muted/40"
            }`}
          />
        )}
      </div>
      {showMeta && (
        <span className="text-[0.62rem] font-mono text-jgd-muted tracking-wide">
          {name.length} chars
        </span>
      )}
    </>
  );

  const baseClasses =
    "shrink-0 flex flex-col gap-1 px-4 py-2.5 rounded-lg border text-[0.82rem] transition-colors";

  if (interactive) {
    return (
      <button
        onClick={onToggle}
        className={`${baseClasses} cursor-pointer ${
          saved
            ? "bg-jgd-accent-dim/40 border-jgd-accent/25"
            : "bg-jgd-surface/40 border-jgd-border hover:bg-jgd-surface/70 hover:border-jgd-border"
        }`}
        style={{ minWidth: "140px" }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} bg-jgd-surface/40 border-jgd-border`}>
      {content}
    </div>
  );
}

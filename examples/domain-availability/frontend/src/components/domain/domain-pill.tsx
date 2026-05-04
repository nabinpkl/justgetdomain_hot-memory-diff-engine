"use client";

import { Star } from "lucide-react";
import { useShortlist } from "@/stores/use-shortlist";

type DomainPillProps = {
  name: string;
  tld: string;
  onClick?: () => void;
  showMeta?: boolean;
  /** When true, pill fills its container (grid cell). Default sizes to content with a min-width (horizontal scroll). */
  fullWidth?: boolean;
};

export function DomainPill({
  name,
  tld,
  onClick,
  showMeta,
  fullWidth,
}: DomainPillProps) {
  const shortlist = useShortlist();
  const fullDomain = `${name}.${tld}`;
  const saved = shortlist.items.includes(fullDomain);

  const toggleSaved = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    saved ? shortlist.remove(fullDomain) : shortlist.add(fullDomain);
  };

  const open = () => {
    onClick?.();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const content = (
    <div className="min-w-0 flex-1">
      <span className="block truncate font-mono text-jgd-text">
        {name}
        <span className="text-jgd-accent">.{tld}</span>
      </span>
      {showMeta && (
        <span className="text-[0.62rem] font-mono text-jgd-muted tracking-wide">
          {name.length} chars
        </span>
      )}
    </div>
  );

  const sizingClasses = fullWidth
    ? "w-full min-w-0"
    : "shrink-0 min-w-[140px]";

  const baseClasses = `${sizingClasses} flex items-center gap-3 px-4 py-2.5 rounded-sm border text-[0.82rem] transition-colors bg-jgd-surface/40 border-jgd-border`;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={open}
      onKeyDown={onKeyDown}
      className={`${baseClasses} ${
        onClick
          ? "cursor-pointer hover:bg-jgd-surface/70 hover:border-jgd-accent/30"
          : ""
      } ${saved ? "border-jgd-accent/35 bg-jgd-accent-dim/35" : ""}`}
    >
      {content}
      <button
        type="button"
        onClick={toggleSaved}
        className="shrink-0 rounded-sm p-1 text-jgd-muted transition-colors hover:bg-jgd-surface/70 hover:text-jgd-accent"
        aria-label={saved ? `Remove ${fullDomain} from watchlist` : `Save ${fullDomain} to watchlist`}
      >
        <Star
          size={15}
          className={saved ? "fill-jgd-accent text-jgd-accent" : "fill-none"}
          aria-hidden
        />
      </button>
    </div>
  );
}

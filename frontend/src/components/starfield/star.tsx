"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { DomainEntry } from "@/components/domain/domain-data";
import type { Brightness } from "@/lib/starfield/brightness";
import type { Position } from "@/lib/starfield/scatter";

type StarProps = {
  entry: DomainEntry;
  displayTld: string;
  brightness: Brightness;
  position: Position | null;
  onClick: (domain: string) => void;
  saved: boolean;
};

const BRIGHTNESS_CLASSES: Record<Brightness, string> = {
  bright: "text-[1.05rem] font-medium text-jgd-text opacity-100",
  mid: "text-[0.92rem] text-jgd-text opacity-85",
  dim: "text-[0.82rem] text-jgd-dim opacity-70",
};

const BUTTON_BASE =
  "jgd-tile-in jgd-ease-out font-mono tracking-tight cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-jgd-accent-mid focus-visible:outline-offset-4 hover:text-jgd-accent";

export function Star({
  entry,
  displayTld,
  brightness,
  position,
  onClick,
  saved,
}: StarProps) {
  const [hover, setHover] = useState(false);
  const fullDomain = `${entry.name}${displayTld}`;
  const altTlds = entry.tlds.filter((t) => t !== displayTld);
  const ariaLabel = `${fullDomain}${saved ? " (saved)" : " — add to shortlist"}`;
  const savedClass = saved ? " text-jgd-accent!" : "";

  if (position === null) {
    return (
      <li className="flex justify-center">
        <button
          type="button"
          onClick={() => onClick(fullDomain)}
          aria-label={ariaLabel}
          className={
            BUTTON_BASE +
            " transition-colors " +
            BRIGHTNESS_CLASSES[brightness] +
            savedClass
          }
        >
          <span className="inline-flex items-center gap-1.5">
            {fullDomain}
            {saved && <Check size={12} strokeWidth={2.5} aria-hidden />}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li
      className="absolute"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="relative"
        style={{
          transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
        }}
      >
        <button
          type="button"
          onClick={() => onClick(fullDomain)}
          aria-label={ariaLabel}
          className={
            BUTTON_BASE +
            " transition-[color,transform] duration-200 hover:scale-110 hover:z-10 motion-reduce:hover:scale-100 " +
            BRIGHTNESS_CLASSES[brightness] +
            savedClass
          }
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {fullDomain}
            {saved && <Check size={12} strokeWidth={2.5} aria-hidden />}
          </span>
        </button>
      </div>
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 rounded-md bg-jgd-surface border border-jgd-border px-3 py-2 text-[0.75rem] text-jgd-dim shadow-[0_8px_24px_rgba(0,0,0,0.25)] whitespace-nowrap"
          style={{ top: "20px", left: 0, transform: "translateX(-50%)" }}
        >
          <div className="text-jgd-text font-mono">{fullDomain}</div>
          {altTlds.length > 0 && (
            <div className="mt-1 text-[0.7rem] font-mono">
              also: {altTlds
                .slice(0, 4)
                .map((t) => `${entry.name}${t}`)
                .join(" · ")}
            </div>
          )}
          <div className="mt-1 text-[0.7rem]">
            {entry.length}ch · {entry.match_count} tld
            {entry.match_count === 1 ? "" : "s"} open
          </div>
          <div className="mt-1 text-jgd-accent text-[0.7rem]">
            {saved ? "saved" : "click to save"}
          </div>
        </div>
      )}
    </li>
  );
}

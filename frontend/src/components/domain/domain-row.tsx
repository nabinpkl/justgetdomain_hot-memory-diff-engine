"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DomainEntry, REGISTRARS } from "./domain-data";
import { TldModal } from "./tld-modal";

const CHIP_CAP = 6;

export function DomainRow({ entry }: { entry: DomainEntry }) {
  const [openTld, setOpenTld] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const visible = entry.tlds.slice(0, CHIP_CAP);
  const overflow = entry.match_count - visible.length;

  return (
    <>
      <div className="px-5 py-3 border-b border-jgd-border">
        <div className="flex flex-wrap items-center gap-2">
          {visible.map((tld) => (
            <DomainChip
              key={tld}
              name={entry.name}
              tld={tld}
              open={openTld === tld}
              onToggle={() => setOpenTld((p) => (p === tld ? null : tld))}
              onClose={() => setOpenTld(null)}
            />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="cursor-pointer text-[0.72rem] px-2 py-1 rounded font-sans transition-colors text-jgd-dim border border-jgd-border hover:text-jgd-text hover:border-jgd-muted"
            >
              +{overflow.toLocaleString()} more
            </button>
          )}
        </div>
      </div>

      {modalOpen && <TldModal name={entry.name} onClose={() => setModalOpen(false)} />}
    </>
  );
}

function DomainChip({
  name,
  tld,
  open,
  onToggle,
  onClose,
}: {
  name: string;
  tld: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const fullDomain = `${name}${tld}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "cursor-pointer rounded font-sans transition-all border inline-flex items-baseline px-2.5 py-1 text-[0.85rem]",
          open
            ? "bg-jgd-accent-dim border-jgd-accent-mid"
            : "bg-jgd-surface border-jgd-border hover:border-jgd-muted"
        )}
      >
        <span className="font-serif tracking-[-0.2px] text-jgd-text">{name}</span>
        <span className="text-jgd-dim">{tld}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 min-w-[180px] rounded-md border border-jgd-border bg-jgd-bg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-jgd-border text-[0.72rem] uppercase tracking-[2px] text-jgd-dim">
            Register {fullDomain}
          </div>
          <div className="flex flex-col">
            {REGISTRARS.map((reg) => (
              <a
                key={reg.name}
                href={`${reg.url}${fullDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 text-[0.8rem] text-jgd-text hover:bg-jgd-surface/60 transition-colors"
              >
                <span>{reg.name}</span>
                <ExternalLink size={12} className="text-jgd-dim" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

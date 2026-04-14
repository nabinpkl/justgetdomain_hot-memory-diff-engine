"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGISTRARS } from "./domain-data";

interface TldsForResponse {
  name: string;
  total: number;
  tlds: string[];
}

const PAGE_SIZE = 100;

export function TldModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [tlds, setTlds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [openTld, setOpenTld] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/tlds-for?name=${encodeURIComponent(name)}&offset=0&limit=${PAGE_SIZE}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TldsForResponse>;
      })
      .then((data) => {
        setTlds(data.tlds);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("tlds-for failed", err);
        setLoading(false);
      });
    return () => controller.abort();
  }, [name]);

  const loadMore = () => {
    if (loading || tlds.length >= total) return;
    setLoading(true);
    fetch(`/api/tlds-for?name=${encodeURIComponent(name)}&offset=${tlds.length}&limit=${PAGE_SIZE}`)
      .then((r) => r.json() as Promise<TldsForResponse>)
      .then((data) => {
        setTlds((prev) => [...prev, ...data.tlds]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("load more failed", err);
        setLoading(false);
      });
  };

  const visible = filter
    ? tlds.filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    : tlds;

  return (
    <div
      className="fixed inset-0 z-[60] bg-jgd-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[720px] max-h-[85vh] rounded-lg bg-jgd-bg border border-jgd-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-jgd-border">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[2px] text-jgd-dim mb-1">
              Available on {total.toLocaleString()} extensions
            </p>
            <h3 className="font-serif text-[1.4rem] font-normal tracking-[-0.5px] text-jgd-text">
              {name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-jgd-dim hover:text-jgd-text transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-jgd-border">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-jgd-surface border border-jgd-border">
            <Search size={14} className="text-jgd-dim shrink-0" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter extensions..."
              className="flex-1 bg-transparent outline-none text-[0.85rem] placeholder:opacity-50 text-jgd-text font-sans"
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {visible.length === 0 && !loading && (
            <p className="text-[0.85rem] text-jgd-dim text-center py-8">
              {filter ? "No extensions match" : "No extensions available"}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {visible.map((tld) => (
              <TldChip
                key={tld}
                name={name}
                tld={tld}
                open={openTld === tld}
                onToggle={() => setOpenTld((p) => (p === tld ? null : tld))}
                onClose={() => setOpenTld(null)}
              />
            ))}
          </div>

          {tlds.length < total && !filter && (
            <div className="flex justify-center mt-5">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="cursor-pointer text-[0.76rem] px-4 py-1.5 rounded border border-jgd-border text-jgd-dim hover:text-jgd-text hover:border-jgd-muted transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : `Load ${Math.min(PAGE_SIZE, total - tlds.length)} more`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TldChip({
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
        <div className="absolute left-0 top-full mt-1 z-10 min-w-[180px] rounded-md border border-jgd-border bg-jgd-bg shadow-lg overflow-hidden">
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

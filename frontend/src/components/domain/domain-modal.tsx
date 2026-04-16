"use client";

import { useEffect, useState, useMemo } from "react";
import { Star, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useShortlist } from "@/stores/use-shortlist";

type TldsForResponse = {
  name: string;
  total: number;
  tlds: string[];
};

type DomainModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string | null;
  heroTld: string | null;
};

function stripDot(tld: string) {
  return tld.startsWith(".") ? tld.slice(1) : tld;
}

function TldRow({
  name,
  tld,
  hero,
}: {
  name: string;
  tld: string;
  hero?: boolean;
}) {
  const shortlist = useShortlist();
  const fullDomain = `${name}.${tld}`;
  const saved = shortlist.items.includes(fullDomain);

  const toggle = () =>
    saved ? shortlist.remove(fullDomain) : shortlist.add(fullDomain);

  if (hero) {
    return (
      <button
        onClick={toggle}
        className={`w-full flex items-center gap-4 px-5 py-6 rounded-lg border transition-colors cursor-pointer ${
          saved
            ? "bg-jgd-accent-dim/60 border-jgd-accent/45"
            : "bg-jgd-surface/60 border-jgd-border hover:border-jgd-accent/35"
        }`}
      >
        <span className="font-mono text-[1.6rem] text-jgd-text whitespace-nowrap leading-none">
          {name}
          <span className="text-jgd-accent">.{tld}</span>
        </span>
        <Star
          size={22}
          className={`ml-auto shrink-0 transition-colors ${
            saved
              ? "fill-jgd-accent text-jgd-accent"
              : "fill-none text-jgd-muted/60"
          }`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md border transition-colors cursor-pointer text-left ${
        saved
          ? "bg-jgd-accent-dim/40 border-jgd-accent/30"
          : "bg-jgd-surface/30 border-jgd-border hover:bg-jgd-surface/60"
      }`}
    >
      <span className="font-mono text-[0.9rem] text-jgd-dim whitespace-nowrap">
        {name}
        <span className="text-jgd-accent/70">.{tld}</span>
      </span>
      <Star
        size={14}
        className={`ml-auto shrink-0 transition-colors ${
          saved
            ? "fill-jgd-accent text-jgd-accent"
            : "fill-none text-jgd-muted/40"
        }`}
      />
    </button>
  );
}

export function DomainModal({
  open,
  onOpenChange,
  name,
  heroTld,
}: DomainModalProps) {
  const [data, setData] = useState<TldsForResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !name) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tlds-for?name=${encodeURIComponent(name)}&limit=500`)
      .then((r) => (r.ok ? (r.json() as Promise<TldsForResponse>) : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, name]);

  const otherTlds = useMemo(() => {
    if (!data || !heroTld) return [];
    return data.tlds.map(stripDot).filter((t) => t !== heroTld);
  }, [data, heroTld]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-jgd-bg/75 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] sm:w-[540px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-jgd-bg border border-jgd-border shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 flex flex-col overflow-hidden">
          {/* Hero */}
          {name && heroTld && (
            <div className="relative px-5 pt-5 pb-4">
              <DialogPrimitive.Close
                className="absolute top-3 right-3 p-1.5 rounded-md text-jgd-muted hover:text-jgd-text hover:bg-jgd-surface/60 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </DialogPrimitive.Close>
              <DialogPrimitive.Title className="sr-only">
                {name}.{heroTld} — available TLDs
              </DialogPrimitive.Title>
              <div className="mb-3">
                <div className="text-[0.62rem] font-mono uppercase tracking-widest text-jgd-accent/70">
                  Available
                </div>
              </div>
              <TldRow name={name} tld={heroTld} hero />
            </div>
          )}

          {/* Divider + count */}
          <div className="px-5 flex items-center gap-3 py-2 border-t border-jgd-border">
            <div className="text-[0.62rem] font-mono uppercase tracking-widest text-jgd-muted">
              Also available
            </div>
            <div className="h-px bg-jgd-border flex-1" />
            <div className="text-[0.68rem] font-mono text-jgd-muted">
              {data ? `${Math.max(data.total - 1, 0)} more` : "\u2026"}
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
            {loading && !data ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-md bg-jgd-surface/40 animate-pulse"
                  />
                ))}
              </div>
            ) : otherTlds.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {name &&
                  otherTlds.map((tld) => (
                    <TldRow key={tld} name={name} tld={tld} />
                  ))}
              </div>
            ) : (
              !loading && (
                <div className="text-[0.82rem] text-jgd-muted font-mono py-4 text-center">
                  No other extensions available.
                </div>
              )
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

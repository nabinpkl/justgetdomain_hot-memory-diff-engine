"use client";

import { ExternalLink } from "lucide-react";

type Registrar = {
  id: string;
  label: string;
  buildUrl: (domain: string) => string;
};

const REGISTRARS: Registrar[] = [
  {
    id: "vercel",
    label: "Vercel",
    buildUrl: (d) =>
      `https://vercel.com/domains/search?q=${encodeURIComponent(d)}`,
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    buildUrl: (d) =>
      `https://domains.cloudflare.com/?domain=${encodeURIComponent(d)}`,
  },
  {
    id: "godaddy",
    label: "GoDaddy",
    buildUrl: (d) =>
      `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(
        d,
      )}`,
  },
  {
    id: "namecheap",
    label: "Namecheap",
    buildUrl: (d) =>
      `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(
        d,
      )}`,
  },
  {
    id: "spaceship",
    label: "Spaceship",
    buildUrl: (d) =>
      `https://www.spaceship.com/domain-search/?query=${encodeURIComponent(d)}`,
  },
];

export function RegistrarLinks({ domain }: { domain: string }) {
  return (
    <div className="mt-3">
      <div className="text-[0.62rem] font-mono uppercase tracking-widest text-jgd-muted mb-1.5">
        Register at
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {REGISTRARS.map((r) => (
          <a
            key={r.id}
            href={r.buildUrl(domain)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open ${domain} at ${r.label} (new tab)`}
            className="group flex items-center justify-center gap-1 px-2 py-2 rounded-sm border border-jgd-border bg-jgd-surface/40 text-[0.7rem] font-mono text-jgd-dim hover:text-jgd-text hover:border-jgd-accent/45 hover:bg-jgd-surface/70 transition-colors"
          >
            <span className="truncate">{r.label}</span>
            <ExternalLink
              size={10}
              className="shrink-0 text-jgd-muted group-hover:text-jgd-accent transition-colors"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

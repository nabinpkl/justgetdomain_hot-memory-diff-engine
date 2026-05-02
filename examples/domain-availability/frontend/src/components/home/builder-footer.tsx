"use client";

import { useEffect, useState } from "react";

const REPO = "https://github.com/nabinpkl/justgetdomain.com";
const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA || "";

type Stats = {
  snapshot_age_seconds: number | null;
};

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.469-2.382 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 6.003 0c2.291-1.552 3.297-1.23 3.297-1.23.654 1.652.243 2.873.119 3.176.77.839 1.235 1.911 1.235 3.221 0 4.609-2.807 5.621-5.479 5.92.43.372.823 1.102.823 2.222 0 1.604-.014 2.896-.014 3.291 0 .322.218.694.825.576C20.565 22.092 24 17.594 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function BuilderFooter() {
  const [snapshotAge, setSnapshotAge] = useState<number | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
      .then((data) => {
        if (cancelled) return;
        setSnapshotAge(data?.snapshot_age_seconds ?? null);
      })
      .catch(() => {
        if (!cancelled) setSnapshotAge(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="px-6 py-12 border-t border-jgd-border">
      <div className="max-w-[640px] mx-auto flex flex-col items-center gap-3 text-center">
        <p className="text-[0.9rem] text-jgd-text">
          Built by{" "}
          <a
            href="https://linkedin.com/in/nabin-pokhrel"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-jgd-accent underline-offset-4 hover:underline"
          >
            Nabin Pokhrel
            <LinkedInIcon className="w-3.5 h-3.5" />
          </a>
        </p>

        <p className="text-[0.78rem] text-jgd-dim">
          Served by{" "}
          <a
            href={`${REPO}/tree/main/crates/hot-index`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-jgd-accent underline-offset-4 hover:underline"
          >
            hot-index
          </a>
          , built with{" "}
          <a
            href={`${REPO}/tree/main/crates/streaming-set-diff`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-jgd-accent underline-offset-4 hover:underline"
          >
            streaming-set-diff
          </a>
          .
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[0.72rem] font-mono text-jgd-muted">
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-jgd-accent transition-colors"
          >
            <GitHubIcon className="w-3.5 h-3.5" />
            github.com/nabinpkl/justgetdomain.com
          </a>

          {GIT_SHA && (
            <>
              <span className="text-jgd-border" aria-hidden>
                |
              </span>
              <a
                href={`${REPO}/commit/${GIT_SHA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-jgd-accent transition-colors"
                title="Last deployed commit"
              >
                deploy {GIT_SHA}
              </a>
            </>
          )}

          {snapshotAge !== undefined && snapshotAge !== null && (
            <>
              <span className="text-jgd-border" aria-hidden>
                |
              </span>
              <span title="Time since the last successful nightly index rebuild">
                last rebuild {formatAgo(snapshotAge)}
              </span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}

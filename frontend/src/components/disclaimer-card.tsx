import { Info } from "lucide-react";

const linkClass =
  "underline underline-offset-[3px] decoration-jgd-dim/40 hover:decoration-jgd-warn hover:text-jgd-text transition-colors";

const bullet = (
  <span
    aria-hidden
    className="absolute left-0 top-[0.62em] h-[3px] w-[3px] rounded-full bg-jgd-warn/60"
  />
);

export function DisclaimerCard({ className = "" }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-label="Project disclaimer"
      className={`rounded-lg border border-jgd-warn/25 bg-jgd-warn/[0.04] px-5 py-4 text-[0.92rem] leading-[1.65] text-jgd-dim ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-jgd-warn/35 bg-jgd-warn/[0.08] px-2 py-[2px] text-[0.6rem] font-semibold uppercase tracking-[1.8px] text-jgd-warn">
        <Info size={10} strokeWidth={2.5} aria-hidden />
        Portfolio project
      </span>

      <p className="mt-3 text-jgd-text/85">
        Not a registrar. Built to solve domain{" "}
        <em className="not-italic text-jgd-text">browsability</em>, not to sell domains.
      </p>

      <ul role="list" className="mt-3 space-y-2 border-t border-jgd-warn/15 pt-3">
        <li className="relative pl-4">
          {bullet}
          Curated word list - only hand-reviewed dictionary words appear. Brand names,
          auth/finance terms, regulated namespaces, and adult content are filtered.
          Best effort, not exhaustive.
        </li>
        <li className="relative pl-4">
          {bullet}
          Availability does not grant trademark rights. Verify with a registrar and check{" "}
          <a
            href="https://tmsearch.uspto.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            USPTO
          </a>
          {" / "}
          <a
            href="https://branddb.wipo.int/"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            WIPO
          </a>{" "}
          before registering.
        </li>
        <li className="relative pl-4">
          {bullet}
          See a word/brand that shouldn&apos;t be listed?{" "}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScVOEVfQqP1EOf2cES6-LjWBXxc30bBahL5xc85uAUHpgS7Jw/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Request removal
          </a>
          .
        </li>
      </ul>
    </aside>
  );
}

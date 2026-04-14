import { Info } from "lucide-react";

const linkClass =
  "underline underline-offset-[3px] decoration-jgd-border hover:decoration-jgd-text hover:text-jgd-text transition-colors";

export function DisclaimerCard({ className = "" }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-label="Project disclaimer"
      className={`flex gap-2.5 rounded-md border border-jgd-border/70 px-3 py-2 text-[0.72rem] leading-[1.6] text-jgd-dim ${className}`}
    >
      <Info
        size={12}
        strokeWidth={2}
        aria-hidden
        className="mt-[0.28em] shrink-0 text-jgd-muted"
      />
      <p>
        <span className="text-jgd-text/85">Portfolio project not a registrar.</span>{" "}
        Built to solve domain browsability, not sell domains. Word list is curated
        (brands, auth/finance, regulated namespaces, and adult content filtered) on
        a best-effort basis, not exhaustive. Availability does not grant trademark
        rights. Verify with a registrar and check{" "}
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
        </p>
    </aside>
  );
}

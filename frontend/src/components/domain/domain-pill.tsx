"use client";

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
  const content = (
    <>
      <span className="font-mono text-jgd-dim whitespace-nowrap">
        {name}
        <span className="text-jgd-accent/55">.{tld}</span>
      </span>
      {showMeta && (
        <span className="text-[0.62rem] font-mono text-jgd-muted tracking-wide">
          {name.length} chars
        </span>
      )}
    </>
  );

  const sizingClasses = fullWidth
    ? "w-full min-w-0"
    : "shrink-0 min-w-[140px]";

  const baseClasses = `${sizingClasses} flex flex-col gap-1 px-4 py-2.5 rounded-lg border text-[0.82rem] transition-colors bg-jgd-surface/40 border-jgd-border`;

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} cursor-pointer hover:bg-jgd-surface/70 hover:border-jgd-accent/30`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

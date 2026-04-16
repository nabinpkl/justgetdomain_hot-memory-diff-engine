const OLD_STEPS = [
  { icon: "\u2192", text: "You guess a name" },
  { icon: "\u2715", text: '\u201cTaken\u201d' },
  { icon: "\u2192", text: "Guess again" },
  { icon: "\u2715", text: '\u201cTaken\u201d' },
  { icon: "\u2026", text: "Settle for something mid" },
];

const NEW_STEPS = [
  { num: "1", text: "We scan every combination" },
  { num: "2", text: "Discard all taken names" },
  { num: "3", text: "You browse what\u2019s left" },
];

export function ComparisonBlock() {
  return (
    <section className="pt-[clamp(2rem,5vh,3rem)] pb-[clamp(3.5rem,10vh,6rem)] px-6">
      <div className="max-w-[720px]">
        <p className="text-[0.65rem] uppercase tracking-[4px] mb-4 text-jgd-accent">
          The problem
        </p>
        <h2 className="mb-4 font-serif text-[clamp(1.6rem,4vw,2.25rem)] font-normal tracking-[-0.5px] leading-[1.25] text-jgd-text">
          You shouldn&apos;t have to <em>guess</em> domain names.
        </h2>
        <p className="text-[0.95rem] text-jgd-dim leading-[1.7] max-w-[500px] mb-10">
          You think of a name, type it into a registrar, see &quot;taken,&quot;
          think of another, see &quot;taken&quot; again, repeat forty times,
          settle for something you don&apos;t love, or give up entirely.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[640px]">
          {/* Old way */}
          <div className="rounded-lg border border-jgd-border bg-jgd-surface/40 px-5 py-6">
            <p className="text-[0.65rem] uppercase tracking-[3px] text-jgd-muted mb-4">
              Every registrar
            </p>
            <div className="flex flex-col gap-2.5">
              {OLD_STEPS.map(({ icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-[0.82rem] text-jgd-dim/70"
                >
                  <span className="w-4 text-center shrink-0 text-[0.75rem] text-[oklch(0.55_0.12_25)]">
                    {icon}
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* New way */}
          <div className="rounded-lg border border-jgd-accent-dim bg-jgd-accent-dim/30 px-5 py-6">
            <p className="text-[0.65rem] uppercase tracking-[3px] text-jgd-accent/70 mb-4">
              JustGetDomain
            </p>
            <div className="flex flex-col gap-2.5">
              {NEW_STEPS.map(({ num, text }) => (
                <div
                  key={num}
                  className="flex items-center gap-2.5 text-[0.82rem] text-jgd-dim"
                >
                  <span className="w-4 h-4 rounded-full border border-jgd-accent/30 flex items-center justify-center shrink-0 text-[0.68rem] text-jgd-accent/80">
                    {num}
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

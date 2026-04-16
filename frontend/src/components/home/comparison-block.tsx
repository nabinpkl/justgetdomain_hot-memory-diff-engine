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
    <section className="pt-[clamp(2rem,5vh,3rem)] pb-[clamp(3.5rem,10vh,6rem)] px-6 sm:px-10">
      <div className="max-w-[1400px] mx-auto">
        <p className="text-[0.72rem] uppercase tracking-[4px] mb-5 text-jgd-accent">
          The problem
        </p>
        <h2 className="mb-5 font-serif text-[clamp(1.8rem,4.5vw,2.75rem)] font-normal tracking-[-0.5px] leading-[1.2] text-jgd-text">
          You shouldn&apos;t have to <em>guess</em> domain names.
        </h2>
        <p className="text-[1.1rem] text-jgd-dim leading-[1.8] max-w-[560px] mb-12">
          You think of a name, type it into a registrar, see &quot;taken,&quot;
          think of another, see &quot;taken&quot; again, repeat forty times,
          settle for something you don&apos;t love, or give up entirely.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Old way */}
          <div className="rounded-lg border border-jgd-border bg-jgd-surface/40 px-8 py-8">
            <p className="text-[0.72rem] uppercase tracking-[3px] text-jgd-muted mb-6">
              Every registrar
            </p>
            <div className="flex flex-col gap-4">
              {OLD_STEPS.map(({ icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 text-[1.05rem] text-jgd-dim/70"
                >
                  <span className="w-5 text-center shrink-0 text-[0.88rem] text-[oklch(0.55_0.12_25)]">
                    {icon}
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* New way */}
          <div className="rounded-lg border border-jgd-accent-dim bg-jgd-accent-dim/30 px-8 py-8">
            <p className="text-[0.72rem] uppercase tracking-[3px] text-jgd-accent/70 mb-6">
              JustGetDomain
            </p>
            <div className="flex flex-col gap-4">
              {NEW_STEPS.map(({ num, text }) => (
                <div
                  key={num}
                  className="flex items-center gap-3.5 text-[1.05rem] text-jgd-dim"
                >
                  <span className="w-6 h-6 rounded-full border border-jgd-accent/30 flex items-center justify-center shrink-0 text-[0.78rem] text-jgd-accent/80">
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

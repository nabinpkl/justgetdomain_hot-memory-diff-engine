const FEATURES = [
  {
    num: "01",
    title: "Pre-checked",
    desc: "Every domain you see has been verified available. No \u201ctaken\u201d results, ever. That\u2019s the whole point.",
  },
  {
    num: "02",
    title: "No front-running",
    desc: "We don\u2019t register, hold, or broker names. We index availability. Your searches stay private and stateless.",
  },
  {
    num: "03",
    title: "Exhaustive",
    desc: "Not a sample, not \u201ctop picks.\u201d The full list of available domains at each length. Browse all of it.",
  },
];

export function TrustSection() {
  return (
    <section className="py-[clamp(3.5rem,8vh,5rem)] px-6">
      <div className="max-w-[720px]">
        <p className="text-[0.65rem] uppercase tracking-[4px] mb-4 text-jgd-accent">
          The approach
        </p>
        <h2 className="mb-8 font-serif text-[clamp(1.5rem,3.5vw,2rem)] font-normal tracking-[-0.5px] leading-[1.3] text-jgd-text max-w-[460px]">
          Senseful discovery, not blind search.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <article
              key={f.num}
              className="rounded-lg border border-jgd-border bg-jgd-surface/30 px-5 py-5"
            >
              <p className="text-[0.65rem] tracking-[2px] mb-2 text-jgd-accent">
                {f.num}
              </p>
              <h3 className="mb-2 font-serif text-[1.05rem] font-normal text-jgd-text">
                {f.title}
              </h3>
              <p className="text-[0.85rem] text-jgd-dim leading-[1.7]">
                {f.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

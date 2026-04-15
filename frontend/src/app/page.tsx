import { HomeHero } from "@/components/home-hero";
import { WaitlistForm } from "@/components/waitlist-form";
import { DisclaimerCard } from "@/components/disclaimer-card";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "JustGetDomain",
  url: "https://justgetdomain.com",
  description:
    "Recursively discovers every available short domain name so you don't have to search one by one. Browse 3, 4, and 5-letter domains that are actually available.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
  },
};

const STEPS = [
  {
    depth: "3",
    title: "Three-letter sweep",
    desc: "Every 3-letter combination across major TLDs. The rarest, most premium namespace \u2014 we surface every available one.",
  },
  {
    depth: "4",
    title: "Four-letter expansion",
    desc: "The sweet spot for brandable names. Dictionary words, abbreviations, pronounceable combos \u2014 filtered to only what\u2019s open.",
  },
  {
    depth: "5",
    title: "Five-letter deep scan",
    desc: "Real words, compound fragments, memorable slugs. The widest net, still filtered down to zero noise \u2014 every result is registrable.",
  },
];

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

const AUDIENCES = [
  {
    label: "Audience 01",
    title: "\u201cI know what I want\u201d",
    desc: "You have a name in mind but it\u2019s taken. You need close variations \u2014 different lengths, real words, alternate TLDs \u2014 that are actually available right now. No more guessing.",
  },
  {
    label: "Audience 02",
    title: "\u201cJust show me what\u2019s open\u201d",
    desc: "You\u2019re tired of the search-reject-repeat loop. You want to browse available domains like a catalog and pick one that clicks. We give you the exhaustive list \u2014 only available names, nothing taken.",
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="overflow-x-clip bg-jgd-bg text-jgd-text font-sans font-medium leading-[1.7]">
        <HomeHero />


        <section className="py-[32px] border-t border-jgd-border">
          <div className="jgd-fade-up px-6 pt-6 pb-10 max-w-[640px] mx-auto [animation-delay:0.6s]">
            <DisclaimerCard />
          </div>
          <div className="max-w-[820px] mx-auto px-6">
            <p className="text-[0.72rem] uppercase tracking-[4px] mb-6 text-jgd-dim">
              The problem
            </p>
            <h2 className="mb-8 font-serif text-[clamp(1.8rem,4vw,2.8rem)] font-normal tracking-[-1px] leading-[1.2]">
              You shouldn&apos;t have to
              <br />
              guess domain names
            </h2>
            <p className="text-[1rem] max-w-[600px] text-jgd-dim leading-[1.9]">
              The current workflow is broken. You think of a name, type it into
              a registrar, see &quot;taken,&quot; think of another, see
              &quot;taken&quot; again, repeat forty times, settle for something
              you don&apos;t love, or give up entirely. Chatbots aren&apos;t
              better &mdash; they&apos;ll happily suggest names that have been
              registered since 2004.
            </p>
            <p className="text-[1rem] max-w-[600px] mt-5 text-jgd-dim leading-[1.9]">
              <strong className="text-jgd-text font-normal">
                JustGetDomain inverts the process.
              </strong>{" "}
              Instead of you guessing and us checking, we check everything first
              and hand you the results. Every available short domain,
              pre-verified, browsable.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mt-14 bg-jgd-border border border-jgd-border">
              {AUDIENCES.map((a) => (
                <div key={a.label} className="bg-jgd-bg px-7 py-9">
                  <p className="text-[0.7rem] uppercase tracking-[3px] mb-4 text-jgd-accent">
                    {a.label}
                  </p>
                  <h3 className="mb-3 font-serif text-[1.3rem] font-normal">
                    {a.title}
                  </h3>
                  <p className="text-[0.95rem] text-jgd-dim leading-[1.8]">
                    {a.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-[120px] border-t border-jgd-border">
          <div className="max-w-[820px] mx-auto px-6">
            <p className="text-[0.72rem] uppercase tracking-[4px] mb-6 text-jgd-dim">
              How it works
            </p>
            <h2 className="mb-8 font-serif text-[clamp(1.8rem,4vw,2.8rem)] font-normal tracking-[-1px] leading-[1.2]">
              Senseful discovery,
              <br />
              not blind search
            </h2>
            <p className="text-[1rem] max-w-[600px] text-jgd-dim leading-[1.9]">
              We start at short letters and work outward. Every combination gets
              checked. Taken names get discarded. What&apos;s left is yours to
              browse &mdash; an exhaustive, living index of domains that are
              actually available to register.
            </p>

            <div className="mt-14 flex flex-col">
              {STEPS.map((step, i) => (
                <div
                  key={step.depth}
                  className={
                    "grid grid-cols-[80px_1fr] border-t border-jgd-border py-7" +
                    (i === STEPS.length - 1 ? " border-b" : "")
                  }
                >
                  <span className="font-serif text-[2rem] text-jgd-accent opacity-70">
                    {step.depth}
                  </span>
                  <div>
                    <h3 className="text-[0.9rem] font-bold tracking-[0.5px] mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-[0.95rem] text-jgd-dim leading-[1.7]">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-[120px] border-t border-jgd-border">
          <div className="max-w-[820px] mx-auto px-6">
            <p className="text-[0.72rem] uppercase tracking-[4px] mb-6 text-jgd-dim">
              The approach
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-14 bg-jgd-border border border-jgd-border">
              {FEATURES.map((f) => (
                <article key={f.num} className="bg-jgd-bg px-6 py-8">
                  <p className="text-[0.7rem] tracking-[2px] mb-3 text-jgd-accent">
                    {f.num}
                  </p>
                  <h3 className="mb-2.5 font-serif text-[1.15rem] font-normal">
                    {f.title}
                  </h3>
                  <p className="text-[0.95rem] text-jgd-dim leading-[1.7]">
                    {f.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="text-center relative py-[140px] border-t border-jgd-border">
          <div className="relative max-w-[820px] mx-auto px-6">
            <h2 className="mb-4 font-serif text-[clamp(1.8rem,4vw,2.8rem)] font-normal tracking-[-1px] leading-[1.2]">
              Get early access
            </h2>
            <p className="text-[0.88rem] mx-auto mb-10 text-center text-jgd-dim max-w-[600px] leading-[1.9]">
              We&apos;ll let you know when the index goes live. No spam.
            </p>
            <WaitlistForm />
          </div>
        </section>

        <div className="text-center py-4 text-[0.9rem] text-jgd-dim">
          Connect with me on LinkedIn:{" "}
          <a href="https://linkedin.com/in/nabin-pokhrel" className="text-jgd-accent">
            Nabin Pokhrel
          </a>
        </div>
      </div>
    </>
  );
}

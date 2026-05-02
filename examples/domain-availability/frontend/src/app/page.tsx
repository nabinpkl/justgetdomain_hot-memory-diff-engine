import { DisclaimerCard } from "@/components/disclaimer-card";
import { HeroSection } from "@/components/home/hero-section";
import { LiveStatsStrip } from "@/components/home/live-stats-strip";
import { DomainMarquee } from "@/components/home/domain-marquee";
import { MechanismBlock } from "@/components/home/mechanism-block";
import { MiniShelvesSection } from "@/components/home/mini-shelves-section";
import { WriteupBlock } from "@/components/home/writeup-block";
import { BuilderFooter } from "@/components/home/builder-footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "JustGetDomain",
  url: "https://justgetdomain.com",
  description:
    "An in-process verification tool for taken-name problems: domains, usernames, package names, breached passwords. Microsecond lookups, nightly rebuilds with no downtime, no database. Designed as a tool an LLM agent can call freely on every candidate it generates.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="overflow-x-clip bg-jgd-bg text-jgd-text font-sans font-medium leading-[1.7]">
        {/* Hero — builder thesis */}
        <HeroSection />

        {/* Live numbers from /stats — refreshes every 30s */}
        {/* <LiveStatsStrip /> */}

        {/* Product taste: scrolling pills of real available names */}
        <DomainMarquee />
        <div className="px-6 pt-6 pb-6 max-w-[960px] mx-auto">
          <DisclaimerCard className="border-0 px-0 py-0 text-[0.68rem] justify-center" />
        </div>

        {/* Product taste: each shelf is one /search call against the index */}
        <MiniShelvesSection />

        {/* The value pitch: pattern, libraries, where else this fits, evidence */}
        <WriteupBlock />

        {/* Deep dive (for those who want the wiring) */}
        <MechanismBlock />

        {/* Builder footer: identity, served-by, last deploy SHA, last index rebuild */}
        <BuilderFooter />
      </div>
    </>
  );
}

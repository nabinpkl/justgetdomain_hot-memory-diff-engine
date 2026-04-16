import { DisclaimerCard } from "@/components/disclaimer-card";
import { WaitlistForm } from "@/components/waitlist-form";
import { HeroSection } from "@/components/home/hero-section";
import { DomainMarquee } from "@/components/home/domain-marquee";
import { ComparisonBlock } from "@/components/home/comparison-block";
import { MiniShelvesSection } from "@/components/home/mini-shelves-section";
import { TrustSection } from "@/components/home/trust-section";
import { LinkedInBlock } from "@/components/home/linkedin-block";

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

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="overflow-x-clip bg-jgd-bg text-jgd-text font-sans font-medium leading-[1.7]">
        {/* Hero */}
        <HeroSection />

        {/* Marquee proof strip + disclaimer */}
        <DomainMarquee />
        <div className="px-6 pt-6 pb-6 max-w-[960px] mx-auto">
          <DisclaimerCard className="border-0 px-0 py-0 text-[0.68rem] justify-center" />
        </div>

        {/* Comparison: old way vs our way */}
        <ComparisonBlock />

        {/* Browsable shelf previews */}
        <MiniShelvesSection />

        {/* Trust / approach */}
        <TrustSection />

        {/* Early access CTA */}
        <section className="text-center relative py-[clamp(3.5rem,10vh,6rem)] border-t border-jgd-border">
          <div className="relative max-w-[820px] mx-auto px-6">
            <h2 className="mb-4 font-serif text-[clamp(1.5rem,3.5vw,2rem)] font-normal tracking-[-0.5px] leading-[1.2] text-jgd-text">
              Get early access
            </h2>
            <p className="text-[0.88rem] mx-auto mb-10 text-center text-jgd-dim max-w-[600px] leading-[1.9]">
              We&apos;ll let you know when the index goes live. No spam.
            </p>
            <WaitlistForm />
          </div>
        </section>

        {/* LinkedIn / built by */}
        <LinkedInBlock />
      </div>
    </>
  );
}

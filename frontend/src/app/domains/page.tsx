import type { Metadata } from "next";
import { DomainSearch } from "@/components/domain-search";

export const metadata: Metadata = {
  title: "Domains — Search & Browse Domains | JustGetDomain",
  description:
    "Browse every available short domain name. Pre-scanned, pre-verified. Only see what you can actually register.",
};

export default function SearchPage() {
  return <DomainSearch />;
}

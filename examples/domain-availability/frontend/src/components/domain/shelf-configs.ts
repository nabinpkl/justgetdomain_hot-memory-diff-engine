export type ShelfConfig = {
  id: string;
  title: string;
  description: string;
  tlds?: string;
  lengths?: string;
  minLength?: number;
  categories?: string;
  group: "vibe" | "tld" | "length";
};

/**
 * Vibe shelves map to backend-curated word categories (see
 * `backend/data/wordlist.json`). Titles and descriptions mirror the ones on
 * the backend so the UI reads coherently even before `/api/categories`
 * responds.
 */
export const SHELF_CONFIGS: ShelfConfig[] = [
  // By Vibe — real word-level categorization from the backend
  {
    id: "tech",
    title: "Tech & Systems",
    description:
      "Speed, precision, systems for SaaS, devtools, startups",
    categories: "tech",
    group: "vibe",
  },
  {
    id: "craft",
    title: "Craft & Build",
    description:
      "Make, shape, forge for studios, makers, artisan brands",
    categories: "craft",
    group: "vibe",
  },
  {
    id: "nature",
    title: "Clean Tech & Energy",
    description:
      "Sustainable, renewable for cleantech, climate, energy brands",
    categories: "nature",
    group: "vibe",
  },
  {
    id: "food",
    title: "Food & Taste",
    description:
      "Flavor-forward names for restaurants, food tech, lifestyle",
    categories: "food",
    group: "vibe",
  },
  {
    id: "motion",
    title: "Motion & Flow",
    description:
      "Speed, action, momentum for sports, fintech, bold brands",
    categories: "motion",
    group: "vibe",
  },

  // By TLD
  {
    id: "app",
    title: ".app Domains",
    description:
      "The app-store TLD. Signals software, tools, products",
    tlds: ".app",
    group: "tld",
  },
  {
    id: "dev",
    title: ".dev Domains",
    description: "By developers, for developers. Your builder identity",
    tlds: ".dev",
    group: "tld",
  },
  {
    id: "io",
    title: ".io Domains",
    description:
      "The startup classic. Still the default for tech products",
    tlds: ".io",
    group: "tld",
  },

  // By Length
  {
    id: "3-letter",
    title: "3-Letter Names",
    description:
      "The rarest namespace. Every available one surfaced",
    lengths: "3",
    group: "length",
  },
  {
    id: "4-letter",
    title: "4-Letter Names",
    description:
      "The sweet spot for brandable names. Short, memorable, available",
    lengths: "4",
    group: "length",
  },
  {
    id: "5-letter",
    title: "5-Letter Names",
    description:
      "Real words, compound fragments, memorable slugs. The widest net",
    lengths: "5",
    group: "length",
  },
  {
    id: "longer",
    title: "Others",
    description:
      "Longer picks. Six characters and up, for when short is taken",
    minLength: 6,
    group: "length",
  },
];

/** The first 3 configs used as homepage teasers. */
export const HOMEPAGE_SHELF_IDS = ["nature", "app", "tech"] as const;

export function getHomepageShelves(): ShelfConfig[] {
  return SHELF_CONFIGS.filter((c) =>
    (HOMEPAGE_SHELF_IDS as readonly string[]).includes(c.id),
  );
}

export type FilterGroup = "all" | "vibe" | "tld" | "length";

export function filterShelves(
  group: FilterGroup,
): ShelfConfig[] {
  if (group === "all") return SHELF_CONFIGS;
  return SHELF_CONFIGS.filter((c) => c.group === group);
}

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const MAX_SHORTLIST = 10;

type ShortlistState = {
  items: string[];
  add: (domain: string) => void;
  remove: (domain: string) => void;
  clear: () => void;
};

export const useShortlist = create<ShortlistState>()(
  persist(
    (set) => ({
      items: [],
      add: (domain) =>
        set((s) => {
          if (s.items.length >= MAX_SHORTLIST || s.items.includes(domain)) {
            return s;
          }
          return { items: [...s.items, domain] };
        }),
      remove: (domain) =>
        set((s) => ({ items: s.items.filter((d) => d !== domain) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "jgd-watchlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

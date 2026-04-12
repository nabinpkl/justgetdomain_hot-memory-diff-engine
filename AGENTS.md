
# JustGetDomain.com

## Architecture

Two parts:

1. **`worker.js`** — Cloudflare Worker (backend/landing page). Single file. All backend changes go here.
2. **`frontend/`** — Next.js 16 app (future product UI). See `frontend/AGENTS.md` for Next.js-specific rules.

## What the product is

A pre-launch domain discovery service. Instead of users guessing names and checking availability one by one, JustGetDomain pre-scans every 3, 4, and 5-letter domain combination across major TLDs, filters out taken names, and presents only what's actually registrable.

**Core promise:** You only see domains you can register. No taken results, no front-running, no brokering — just an exhaustive index of available short domains.

## Current state

- Landing page served by `worker.js` (no live domain index yet)
- Waitlist form is non-functional (`onsubmit="return false;"`)
- CTA section explicitly notes "Not working now — connect on LinkedIn for business opportunities"
- LinkedIn: https://linkedin.com/in/nabin-pokhrel
- `frontend/` is scaffolded but empty — no pages built yet

## Worker routes

| Path | Behavior |
|------|----------|
| `/` | Serves `LANDING_PAGE` HTML string |
| `/robots.txt` | Returns `Allow: *` + sitemap pointer |
| `/sitemap.xml` | Returns XML sitemap with today's date |

## Landing page design (`worker.js`)

- Dark terminal aesthetic: `#050505` background, `#00ff41` green accent
- Fonts: JetBrains Mono (mono) + Instrument Serif (headings)
- Animated terminal demo shows recursive domain scanning sequence
- Sections: Hero → Problem → How it works (3/4/5-letter steps) → Approach features → Waitlist CTA → Footer
- Scroll-triggered fade-in animations via `IntersectionObserver`
- Responsive: single-column on mobile (`max-width: 640px`)

## `worker.js` constraints

- **Monolith only** — `LANDING_PAGE` is a template literal inside `worker.js`. HTML, CSS, and JS all live in that string.
- Cloudflare Worker ES module syntax (`export default { async fetch(...) }`)
- No build step, no npm, no bundler — deploy directly to Cloudflare Workers
- The sitemap uses template literals inside a regular string (note: `${domain}` and `${new Date()...}` in the sitemap block are inside a regular string, not a template literal — they won't interpolate at runtime; this is a known bug)

## `frontend/` stack

- **Framework:** Next.js 16.2.3, App Router, TypeScript, `src/` directory, `@/*` alias
- **Package manager:** pnpm
- **Styling:** Tailwind CSS v4 (CSS-first via `@tailwindcss/postcss`)
- **UI components:** shadcn/ui — all components installed in `src/components/ui/`
- **State:** Zustand v5 (client), TanStack Query v5 (server)
- **Animation:** motion v12 (`motion/react`)
- **Dev server:** `pnpm dev` from `frontend/`

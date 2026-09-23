# Linked — celebrity relationship timelines

Search any well-known person and see their dating/marriage history laid out
as a timeline: who, when it started, how long it lasted, and whether any
relationships overlapped. Built entirely on free infrastructure.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling, with a small hand-rolled design-token set
  (no default shadcn theme — colors/type are custom, see `tailwind.config.ts`)
- **Framer Motion** for the timeline reveal animation
- **Wikidata** (SPARQL, no API key) as the factual source of truth for
  spouses/partners and their start/end dates
- **Wikipedia**, via Wikidata's sitelinks, for the "source" link shown on
  each page

No paid API, no database, no auth. Everything runs on free tiers.

## How the data works

1. `lib/wikidata.ts` resolves a searched name to a Wikidata entity (filtered
   to humans only, via `wdt:P31 = Q5`).
2. It then runs a SPARQL query for `P26` (spouse) and `P451` (unmarried
   partner) statements, pulling the `P580`/`P582` (start/end time)
   qualifiers off each one.
3. Duplicate partners (e.g. "dated" then later "married" the same person)
   are merged into a single timeline entry.
4. `lib/stats.ts` derives the ledger stats: longest relationship, total
   years tracked, and any overlapping relationships.

**Coverage will vary.** Wikidata is comprehensive for A-list, heavily
documented public figures and much thinner for others — this is the
tradeoff of using a free, structured, sourced dataset instead of an LLM
guessing at facts (which would risk confidently stating wrong things about
real people). The footer on every result page links back to Wikidata so
visitors can fix or fill in missing data themselves, and it'll show up here
automatically on the next fetch.

## Running locally

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_SITE_URL once you have a domain
npm run dev
```

Visit `http://localhost:3000`, or jump straight to
`http://localhost:3000/celebrity/taylor-swift`.

## Deploying for free

**Vercel (recommended, made by the Next.js team):**

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import the repo. No config needed,
   it auto-detects Next.js.
3. Add the environment variable `NEXT_PUBLIC_SITE_URL` set to your
   `*.vercel.app` URL (or your custom domain later).
4. Deploy. Free tier comfortably covers a new site's traffic.

**Alternative:** Netlify and Cloudflare Pages both also support Next.js
App Router on their free tiers if you'd rather not use Vercel.

## Getting found on Google (realistic expectations)

This project ships the SEO groundwork — per-page `<title>`/description,
canonical URLs, Open Graph tags, a `Person` JSON-LD block for rich results,
a generated `sitemap.xml` and `robots.txt`. That's the part code can do.

What code can't do: guarantee rankings. You're competing with large,
long-established gossip/wiki sites. Realistic path is long-tail traffic
("who has X dated") built up over months, not instant front-page results.
Submit the sitemap in Google Search Console on day one, and expand
`lib/trending.ts` with more names over time — every name in that list gets
a dedicated indexed URL.

## Extending it

Ideas that fit naturally into the existing structure:

- A "constellation" view: force-directed graph connecting people who share
  an ex (Wikidata already gives you enough to compute this).
- An LLM-generated one-line "story" per relationship, generated server-side
  and cached — but only ever fed the dates/names already fetched from
  Wikidata, never asked to invent facts. Keeps prose lively without
  introducing hallucinated claims about real people.
- A "still going" filter to show only currently active relationships.

## A note on accuracy and taste

All data here reflects public, sourced facts (the same ones behind
Wikipedia infoboxes) — not rumors or tabloid claims. Keep it that way if
you extend this: anything added should be sourced, and anything uncertain
should say so rather than guess.

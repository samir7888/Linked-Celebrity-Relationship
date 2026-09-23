# Feature: LLM fallback for missing/recent relationships

## Context

This is a Next.js 14 (App Router, TypeScript) project called "Linked". It shows
a celebrity's relationship history as a timeline.

Relevant existing files:
- `lib/types.ts` — defines `RelationshipEdge` and `PersonRecord`
- `lib/wikidata.ts` — fetches relationship data from Wikidata (SPARQL), exports
  `fetchPersonRecord(query: string): Promise<PersonRecord | null>`
- `lib/stats.ts` — computes ledger stats (longest relationship, overlaps, etc.)
- `app/api/relationships/route.ts` — API route that calls `fetchPersonRecord`
  and caches the result in memory
- `components/Timeline.tsx` — renders the timeline UI, including a `TypeTag`
  sub-component for the "Married" / "Together" badge
- `app/celebrity/[slug]/page.tsx` — server component that renders the page

**Problem:** Wikidata is a structured but slow-moving dataset. It's often
missing a celebrity's most recent relationship or breakup, and sometimes
missing minor/private relationships entirely. We want to supplement it with
an LLM's general knowledge — but LLMs hallucinate confidently, and this app
makes factual claims about real people, so the LLM path needs to be strictly
constrained and visually distinguished from the sourced Wikidata data.

## Goal

When a user searches a name, call Wikidata (existing) and a free LLM
(Groq, running an open model like `llama-3.3-70b-versatile`) **in parallel**.
Merge the results into one timeline:
- Wikidata data is treated as ground truth.
- LLM data fills in relationships Wikidata doesn't have (esp. recent ones).
- Every LLM-sourced entry is visually tagged as "Reported" (not "Confirmed")
  and rendered with a distinct, lower-confidence style — never presented as
  equally certain as the Wikidata data.
- The LLM must never be allowed to override or contradict a Wikidata date —
  only add missing partners, or add a missing end-date to an ongoing Wikidata
  relationship if it's confident that person is now broken up.

## Step 1 — Environment setup

1. Sign up for a free Groq API key at https://console.groq.com (free tier,
   generous rate limits, no credit card required as of writing — verify
   current terms since free-tier policies change).
2. Add to `.env.example` and `.env.local`:
   ```
   GROQ_API_KEY=your_key_here
   ```
3. Add `GROQ_API_KEY` as an environment variable in the Vercel project
   settings when deploying (never commit the real key).

## Step 2 — Extend the shared types

In `lib/types.ts`, add a `source` and `confidence` field to `RelationshipEdge`
so the UI can tell the two data origins apart:

```ts
export type RelationshipSource = "wikidata" | "llm";

export interface RelationshipEdge {
  partnerQid: string | null;   // null for LLM-sourced entries (no Wikidata ID)
  name: string;
  type: RelationshipType;
  start: string | null;
  end: string | null;
  ongoing: boolean;
  image: string | null;
  source: RelationshipSource;  // NEW
  confidence: "confirmed" | "reported"; // NEW — "confirmed" = wikidata, "reported" = llm
}
```

Update `lib/wikidata.ts` so every edge it produces sets
`source: "wikidata"` and `confidence: "confirmed"`.

## Step 3 — Create `lib/llm.ts`

This module calls Groq's OpenAI-compatible chat completions endpoint
(`https://api.groq.com/openai/v1/chat/completions`) with strict JSON output.

Requirements:
- Export `fetchLLMRelationships(name: string, knownPartnerNames: string[]): Promise<RelationshipEdge[]>`.
- Use `response_format: { type: "json_object" }` (or Groq's `json_schema`
  structured-output mode if available on the model you pick — check current
  Groq docs, this API surface evolves) so the model is constrained to valid JSON.
- Set `temperature: 0` for determinism.
- Set a hard timeout (e.g. `AbortSignal.timeout(6000)`) — if Groq is slow or
  down, the app must still work with Wikidata-only results. Never let a slow
  LLM call block or break the page.
- Wrap the whole thing in try/catch; on any failure, return `[]`.
- Validate the parsed JSON against an expected shape by hand (or with `zod`
  if already a dependency, add it if not) before trusting it — never pass
  ungvalidated LLM output straight into the UI.

### Exact system prompt to embed in the code

```
You are a strict fact-checking assistant. You list only the romantic
relationships (dating, engagement, marriage) of a named public figure that
have been reported by multiple mainstream news outlets. Follow these rules
exactly:

1. Only include a relationship if you have high confidence it was widely
   and repeatedly reported in mainstream media (not a single blog, not a
   fan theory, not a rumor).
2. Never guess or estimate a date. If you don't know the exact start or end
   date, set that field to null. Partial dates are fine: use "YYYY", 
   "YYYY-MM", or "YYYY-MM-DD" depending on how precisely it's known.
3. If the relationship is ongoing (no public breakup/divorce reported),
   set "end" to null and "ongoing" to true.
4. If you have no confident knowledge of any relationships for this person,
   return an empty "relationships" array. Do not fabricate one to be helpful.
5. Do not repeat a relationship that's already listed in "alreadyKnown" —
   only add ones missing from that list, UNLESS you have a more precise end
   date for one of them, in which case include it again with
   "updateOnly": true and only the fields you're confident add new
   information.
6. Output strictly valid JSON only. No prose, no markdown code fences, no
   explanations before or after the JSON.

Output schema:
{
  "relationships": [
    {
      "partnerName": string,
      "type": "dating" | "engaged" | "married",
      "start": string | null,
      "end": string | null,
      "ongoing": boolean,
      "updateOnly": boolean
    }
  ]
}
```

### Exact user prompt template

```
Public figure: {{name}}
Already known relationships (do not repeat unless adding a missing end
date): {{knownPartnerNames.join(", ") || "none"}}

Return the JSON now.
```

### Function skeleton

```ts
import type { RelationshipEdge } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `...paste the exact system prompt from above...`;

interface RawLLMRelationship {
  partnerName: string;
  type: "dating" | "engaged" | "married";
  start: string | null;
  end: string | null;
  ongoing: boolean;
  updateOnly?: boolean;
}

function isValidRaw(x: any): x is RawLLMRelationship {
  return (
    x &&
    typeof x.partnerName === "string" &&
    ["dating", "engaged", "married"].includes(x.type) &&
    (x.start === null || typeof x.start === "string") &&
    (x.end === null || typeof x.end === "string") &&
    typeof x.ongoing === "boolean"
  );
}

export async function fetchLLMRelationships(
  name: string,
  knownPartnerNames: string[]
): Promise<RelationshipEdge[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return []; // feature degrades gracefully if unset

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Public figure: ${name}\nAlready known relationships (do not repeat unless adding a missing end date): ${
              knownPartnerNames.join(", ") || "none"
            }\n\nReturn the JSON now.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const rawList: unknown[] = Array.isArray(parsed?.relationships) ? parsed.relationships : [];

    return rawList
      .filter(isValidRaw)
      .map((r) => ({
        partnerQid: null,
        name: r.partnerName,
        type: r.type === "married" ? "spouse" : "partner",
        start: r.start,
        end: r.end,
        ongoing: r.ongoing,
        image: null,
        source: "llm" as const,
        confidence: "reported" as const,
      }));
  } catch {
    return []; // timeout, network error, bad JSON -> fail silently to Wikidata-only
  }
}
```

## Step 4 — Merge logic in `lib/merge.ts` (new file)

```ts
import type { RelationshipEdge } from "./types";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "");
}

/**
 * Wikidata entries always win on conflicting fields. LLM entries only:
 *  - add a partner Wikidata has no record of at all, or
 *  - fill in a missing "end" date on a Wikidata entry Wikidata shows as
 *    still ongoing, when the LLM is confident it has ended.
 * LLM entries never overwrite a Wikidata start date, type, or image.
 */
export function mergeRelationships(
  wikidataEdges: RelationshipEdge[],
  llmEdges: RelationshipEdge[]
): RelationshipEdge[] {
  const byName = new Map<string, RelationshipEdge>();
  for (const edge of wikidataEdges) {
    byName.set(normalizeName(edge.name), edge);
  }

  for (const llmEdge of llmEdges) {
    const key = normalizeName(llmEdge.name);
    const existing = byName.get(key);

    if (!existing) {
      // Brand new partner Wikidata doesn't know about at all.
      byName.set(key, llmEdge);
      continue;
    }

    // Only fill a gap: existing is ongoing per Wikidata, LLM reports an end.
    if (existing.ongoing && !existing.end && llmEdge.end) {
      byName.set(key, {
        ...existing,
        end: llmEdge.end,
        ongoing: false,
        // Downgrade confidence on just this filled-in field by keeping the
        // edge's overall confidence as "confirmed" (name/start still are)
        // but you may want a finer-grained per-field confidence if you
        // extend this further.
      });
    }
    // Otherwise: Wikidata wins, ignore the LLM entry entirely.
  }

  return Array.from(byName.values()).sort((a, b) => {
    if (!a.start) return 1;
    if (!b.start) return -1;
    return a.start.localeCompare(b.start);
  });
}
```

## Step 5 — Wire it into the API route

In `app/api/relationships/route.ts`, after getting the Wikidata record, call
the LLM in parallel with `Promise.allSettled` (never let an LLM failure
break the Wikidata-only response) and merge:

```ts
import { fetchLLMRelationships } from "@/lib/llm";
import { mergeRelationships } from "@/lib/merge";

// ...inside the try block, after fetching `record` from fetchPersonRecord:
const knownNames = record.relationships.map((r) => r.name);
const [llmResult] = await Promise.allSettled([
  fetchLLMRelationships(record.name, knownNames),
]);
const llmEdges = llmResult.status === "fulfilled" ? llmResult.value : [];

const merged = {
  ...record,
  relationships: mergeRelationships(record.relationships, llmEdges),
};

cache.set(key, { record: merged, expires: Date.now() + TTL_MS });
return NextResponse.json(merged);
```

Also apply the same merge in `app/celebrity/[slug]/page.tsx`'s server-side
`getPerson` function (the page fetches directly via `fetchPersonRecord`, not
through the API route — keep both paths consistent).

## Step 6 — Reflect the distinction in the UI

In `components/Timeline.tsx`:

- `TypeTag` currently shows "Married" / "Together". Leave that as-is — it
  describes the relationship type, not its source.
- Add a second, separate badge for `confidence === "reported"` entries,
  e.g. a small label reading "Reported" (not "Unconfirmed" — keep the tone
  matter-of-fact, not alarmist) styled with a dashed border in the existing
  `ink-soft` tone — do not invent a new accent color for this, reuse the
  existing token set from `tailwind.config.ts`.
- Give "reported" entries a dashed (not solid) left border or dashed avatar
  ring, so the distinction is visible at a glance without reading the badge.
- On the person page, add one line under the existing Wikidata disclaimer
  paragraph:
  > "Entries marked 'Reported' come from general knowledge rather than a
  > structured public record, and may be incomplete or imprecise."

## Step 7 — Testing checklist

- [ ] Search someone with rich Wikidata coverage and no `GROQ_API_KEY` set
      → app works exactly as before (no crash, no "reported" badges).
- [ ] Search someone with a recent, widely-reported relationship that's
      missing from Wikidata → it appears, tagged "Reported".
- [ ] Temporarily hardcode the Groq fetch to always throw → confirm the
      page still renders the Wikidata-only timeline with no error shown to
      the user.
- [ ] Confirm an LLM entry never overwrites a Wikidata start date or type
      by logging both edge lists before/after merge on a test name.
- [ ] Rate-limit check: hammer the API route with the same name repeatedly
      and confirm the in-memory cache prevents refetching Groq on every
      request within the TTL window.

## Non-negotiables (do not relax these)

- The LLM must never be the sole source presented as fact without the
  "Reported" distinction — this is the difference between "sourced app"
  and "app that occasionally makes up things about real people."
- No LLM call should ever block page render past a few seconds — always
  timeout and degrade to Wikidata-only.
- Never log or expose the raw Groq API key to the client; all calls happen
  server-side (API route / server component), never in a client component.

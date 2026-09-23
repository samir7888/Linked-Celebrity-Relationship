import { NextRequest, NextResponse } from "next/server";
import { fetchPersonRecord } from "@/lib/wikidata";
import { fetchLLMRelationships } from "@/lib/llm";
import { mergeRelationships } from "@/lib/merge";

export const runtime = "nodejs";

// Simple in-memory cache. On serverless platforms each cold start gets a
// fresh instance, but warm instances (and local/dev) reuse it, which keeps
// us polite to the free Wikidata endpoint under repeat traffic.
const cache = new Map<string, { record: unknown; expires: number }>();
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Missing ?name= parameter" },
      { status: 400 }
    );
  }

  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    console.log("[API] Cache HIT for:", name, "— returning cached result (LLM not called)");
    return NextResponse.json(cached.record);
  }
  console.log("[API] Cache MISS for:", name, "— fetching fresh data...");

  try {
    // Kick off Wikidata first so we have the canonical name for the LLM prompt.
    // We must resolve the person before we can call the LLM with their name.
    const record = await fetchPersonRecord(name);
    if (!record) {
      return NextResponse.json(
        { error: `No public relationship data found for "${name}".` },
        { status: 404 }
      );
    }

    // Now that we have the Wikidata record, fire the LLM in parallel with any
    // remaining work. We wait for the LLM response before returning so the
    // merged result is always complete — never a partial/late update.
    const knownNames = record.relationships.map((r) => r.name);
    const relatives = record.relatives ?? [];
    const [llmResult] = await Promise.allSettled([
      fetchLLMRelationships(record.name, knownNames, relatives),
    ]);
    const llmEdges = llmResult.status === "fulfilled" ? llmResult.value : [];

    const merged = {
      ...record,
      relationships: mergeRelationships(record.relationships, llmEdges, [
        record.name,
        ...relatives,
      ]),
    };

    cache.set(key, { record: merged, expires: Date.now() + TTL_MS });
    return NextResponse.json(merged);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong reaching Wikidata. Try again shortly." },
      { status: 502 }
    );
  }
}


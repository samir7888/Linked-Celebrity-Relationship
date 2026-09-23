import type { RelationshipEdge } from "./types";

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "");
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
  llmEdges: RelationshipEdge[],
  excludedNames: string[] = []
): RelationshipEdge[] {
  const excludedSet = new Set(excludedNames.map(normalizeName));

  const byName = new Map<string, RelationshipEdge>();
  for (const edge of wikidataEdges) {
    const key = normalizeName(edge.name);
    if (excludedSet.has(key)) continue;
    byName.set(key, edge);
  }

  for (const llmEdge of llmEdges) {
    const key = normalizeName(llmEdge.name);
    if (excludedSet.has(key)) continue;
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

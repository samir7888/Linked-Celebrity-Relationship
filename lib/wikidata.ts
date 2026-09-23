import type {
  PartnerNetworkLink,
  PersonRecord,
  RelationshipEdge,
  RelationshipType,
} from "./types";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "LinkedTimelineApp/1.0 (educational project; contact: set-your-email@example.com)";

// Wikimedia asks every tool to identify itself. Browsers can't set a custom
// User-Agent header, which is one reason these calls are made from our own
// API route on the server rather than directly from the client.
function commonHeaders() {
  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
}

interface WbSearchResult {
  id: string;
  label: string;
  description?: string;
}

async function searchWikidataCandidates(
  name: string
): Promise<WbSearchResult[]> {
  const url = new URL(WIKIDATA_API);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", name);
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", "6");
  url.searchParams.set("origin", "*");

  const res = await fetch(url.toString(), {
    headers: commonHeaders(),
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.search ?? []).map((s: any) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }));
}

/** SPARQL query that, given a batch of candidate QIDs, returns which ones are
 * humans (P31 = Q5) along with their picture and connected English Wikipedia
 * article, in one round trip. */
async function filterHumans(qids: string[]) {
  if (qids.length === 0)
    return new Map<
      string,
      { image: string | null; wikipediaUrl: string | null }
    >();
  const values = qids.map((q) => `wd:${q}`).join(" ");
  const query = `
    SELECT ?person ?image ?article WHERE {
      VALUES ?person { ${values} }
      ?person wdt:P31 wd:Q5 .
      OPTIONAL { ?person wdt:P18 ?image. }
      OPTIONAL {
        ?article schema:about ?person ;
                 schema:isPartOf <https://en.wikipedia.org/> .
      }
    }
  `;
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(
    query
  )}&format=json`;
  const res = await fetch(url, {
    headers: { ...commonHeaders(), Accept: "application/sparql-results+json" },
    next: { revalidate: 86400 },
  });
  const map = new Map<
    string,
    { image: string | null; wikipediaUrl: string | null }
  >();
  if (!res.ok) return map;
  const data = await res.json();
  for (const row of data.results.bindings) {
    const qid = row.person.value.split("/").pop();
    map.set(qid, {
      image: row.image?.value ? toCommonsFilePath(row.image.value) : null,
      wikipediaUrl: row.article?.value ?? null,
    });
  }
  return map;
}

function toCommonsFilePath(commonsEntityUrl: string): string {
  // wdt:P18 values come back as special-file-path URLs already, just add a size hint.
  try {
    const u = new URL(commonsEntityUrl);
    u.searchParams.set("width", "480");
    return u.toString();
  } catch {
    return commonsEntityUrl;
  }
}

export async function resolvePerson(query: string): Promise<{
  qid: string;
  name: string;
  description: string | null;
} | null> {
  const candidates = await searchWikidataCandidates(query);
  if (candidates.length === 0) return null;

  const humanInfo = await filterHumans(candidates.map((c) => c.id));
  const humanMatch = candidates.find((c) => humanInfo.has(c.id));
  if (!humanMatch) return null;

  return {
    qid: humanMatch.id,
    name: humanMatch.label,
    description: humanMatch.description ?? null,
  };
}

const RELATIONSHIP_PROPERTIES: { property: string; type: RelationshipType }[] =
  [
    { property: "P26", type: "spouse" },
    { property: "P451", type: "partner" },
  ];

async function fetchRelatives(qid: string): Promise<string[]> {
  const sparql = `
    SELECT DISTINCT ?relLabel WHERE {
      { wd:${qid} wdt:P3373 ?rel }
      UNION { wd:${qid} wdt:P22 ?rel }
      UNION { wd:${qid} wdt:P25 ?rel }
      UNION { wd:${qid} wdt:P40 ?rel }
      UNION { wd:${qid} wdt:P1038 ?rel }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(
    sparql
  )}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { ...commonHeaders(), Accept: "application/sparql-results+json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results?.bindings ?? [])
      .map((b: any) => b.relLabel?.value)
      .filter(
        (name: any): name is string =>
          typeof name === "string" && name.trim().length > 0
      );
  } catch {
    return [];
  }
}

/** One extra hop from each of the subject's partners: other spouses/partners
 * of those people. Those "others" share an ex (the hub) with the subject. */
async function fetchPartnerNetwork(
  subjectQid: string
): Promise<PartnerNetworkLink[]> {
  const sparql = `
    SELECT ?hub ?hubLabel ?hubImage ?other ?otherLabel ?otherImage ?type ?start ?end WHERE {
      { wd:${subjectQid} wdt:P26 ?hub }
      UNION
      { wd:${subjectQid} wdt:P451 ?hub }
      {
        ?hub p:P26 ?stmt .
        ?stmt ps:P26 ?other .
        BIND("spouse" AS ?type)
      }
      UNION
      {
        ?hub p:P451 ?stmt .
        ?stmt ps:P451 ?other .
        BIND("partner" AS ?type)
      }
      FILTER(?other != wd:${subjectQid})
      OPTIONAL { ?stmt pq:P580 ?start. }
      OPTIONAL { ?stmt pq:P582 ?end. }
      OPTIONAL { ?hub wdt:P18 ?hubImage. }
      OPTIONAL { ?other wdt:P18 ?otherImage. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 120
  `;
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(
    sparql
  )}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { ...commonHeaders(), Accept: "application/sparql-results+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const links: PartnerNetworkLink[] = [];
    const seen = new Set<string>();
    for (const row of data.results?.bindings ?? []) {
      const hubQid: string = row.hub.value.split("/").pop();
      const otherQid: string = row.other.value.split("/").pop();
      const key = hubQid < otherQid ? `${hubQid}:${otherQid}` : `${otherQid}:${hubQid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        hubQid,
        hubName: row.hubLabel?.value ?? "Unknown",
        hubImage: row.hubImage?.value
          ? toCommonsFilePath(row.hubImage.value)
          : null,
        otherQid,
        otherName: row.otherLabel?.value ?? "Unknown",
        otherImage: row.otherImage?.value
          ? toCommonsFilePath(row.otherImage.value)
          : null,
        type: row.type.value as RelationshipType,
        start: row.start?.value ?? null,
        end: row.end?.value ?? null,
      });
    }
    return links;
  } catch {
    return [];
  }
}

export async function fetchPersonRecord(
  query: string
): Promise<PersonRecord | null> {
  const resolved = await resolvePerson(query);
  if (!resolved) return null;

  const sparql = `
    SELECT ?partner ?partnerLabel ?start ?end ?type ?partnerImage WHERE {
      {
        wd:${resolved.qid} p:P26 ?stmt .
        ?stmt ps:P26 ?partner .
        BIND("spouse" AS ?type)
      }
      UNION
      {
        wd:${resolved.qid} p:P451 ?stmt .
        ?stmt ps:P451 ?partner .
        BIND("partner" AS ?type)
      }
      OPTIONAL { ?stmt pq:P580 ?start. }
      OPTIONAL { ?stmt pq:P582 ?end. }
      OPTIONAL { ?partner wdt:P18 ?partnerImage. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY ?start
  `;
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(
    sparql
  )}&format=json`;

  const [res, relatives, humanInfo, partnerNetwork] = await Promise.all([
    fetch(url, {
      headers: { ...commonHeaders(), Accept: "application/sparql-results+json" },
      next: { revalidate: 3600 },
    }).catch(() => null),
    fetchRelatives(resolved.qid),
    filterHumans([resolved.qid]),
    fetchPartnerNetwork(resolved.qid),
  ]);

  const relationships: RelationshipEdge[] = [];
  if (res && res.ok) {
    const data = await res.json();
    for (const row of data.results.bindings) {
      const partnerQid: string = row.partner.value.split("/").pop();
      const start = row.start?.value ?? null;
      const end = row.end?.value ?? null;
      relationships.push({
        partnerQid,
        name: row.partnerLabel?.value ?? "Unknown",
        type: row.type.value as RelationshipType,
        start,
        end,
        ongoing: !end,
        image: row.partnerImage?.value
          ? toCommonsFilePath(row.partnerImage.value)
          : null,
        source: "wikidata",
        confidence: "confirmed",
      });
    }
  }

  // De-duplicate: the same partner can appear once as "partner" and again as
  // "spouse" (dated, then married). Keep the entry with the earliest start
  // date and merge the marriage flag in as the more specific type.
  const byPartner = new Map<string, RelationshipEdge>();
  for (const rel of relationships) {
    if (!rel.partnerQid) continue; // Skip if no QID (shouldn't happen for wikidata)
    const existing = byPartner.get(rel.partnerQid);
    if (!existing) {
      byPartner.set(rel.partnerQid, rel);
      continue;
    }
    const earliest =
      !rel.start || (existing.start && rel.start < existing.start)
        ? existing
        : rel;
    byPartner.set(rel.partnerQid, {
      ...earliest,
      type:
        existing.type === "spouse" || rel.type === "spouse"
          ? "spouse"
          : "partner",
      end: rel.end || existing.end,
      ongoing: !(rel.end || existing.end),
      source: "wikidata",
      confidence: "confirmed",
    });
  }

  const dedupedRelationships = Array.from(byPartner.values()).sort((a, b) => {
    if (!a.start) return 1;
    if (!b.start) return -1;
    return a.start.localeCompare(b.start);
  });

  const info = humanInfo.get(resolved.qid);

  return {
    qid: resolved.qid,
    name: resolved.name,
    description: resolved.description,
    image: info?.image ?? null,
    wikipediaUrl: info?.wikipediaUrl ?? null,
    relationships: dedupedRelationships,
    relatives,
    partnerNetwork,
  };
}

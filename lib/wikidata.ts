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

/** Helper to resolve entity names by QID when labels are missing. Note:
 * SERVICE wikibase:label does NOT follow redirects — if a QID was merged
 * into another item (common when duplicate Wikidata items get cleaned up),
 * this silently returns the QID string itself as the "label" instead of
 * erroring. resolveEntityNames() below rejects those QID-shaped fallbacks
 * so callers know to fall back to resolveNamesViaWbGetEntities(), which
 * does follow redirects. */
async function resolveEntityNames(
  qids: string[]
): Promise<Map<string, string>> {
  if (qids.length === 0) return new Map();

  const values = qids.map((q) => `wd:${q}`).join(" ");
  const query = `
    SELECT ?entity ?entityLabel WHERE {
      VALUES ?entity { ${values} }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(
    query
  )}&format=json`;

  try {
    const res = await fetch(url, {
      headers: {
        ...commonHeaders(),
        Accept: "application/sparql-results+json",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return new Map();

    const data = await res.json();
    const nameMap = new Map<string, string>();

    for (const row of data.results?.bindings ?? []) {
      const qid = row.entity.value.split("/").pop();
      const label = row.entityLabel?.value;
      if (
        qid &&
        label &&
        !label.startsWith("http://") &&
        !/^Q\d+$/.test(label) // reject redirect fallback (label === the QID itself)
      ) {
        nameMap.set(qid, label);
      }
    }

    return nameMap;
  } catch {
    return new Map();
  }
}

/** Fallback name resolver for QIDs that SERVICE wikibase:label couldn't
 * label (usually because the item was merged/redirected into another QID).
 * wbgetentities transparently follows redirects, so a stale/merged ID still
 * resolves to its current real label instead of printing the ID itself. */
async function resolveNamesViaWbGetEntities(
  qids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (qids.length === 0) return map;

  for (let i = 0; i < qids.length; i += 50) {
    const chunk = qids.slice(i, i + 50);
    const url = new URL(WIKIDATA_API);
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("ids", chunk.join("|"));
    url.searchParams.set("props", "labels");
    url.searchParams.set("languages", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    try {
      const res = await fetch(url.toString(), {
        headers: commonHeaders(),
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const requestedQid of chunk) {
        const label = data.entities?.[requestedQid]?.labels?.en?.value;
        if (label) map.set(requestedQid, label);
      }
    } catch {
      // leave unresolved; caller keeps its existing fallback name
    }
  }

  return map;
}

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
      headers: {
        ...commonHeaders(),
        Accept: "application/sparql-results+json",
      },
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
      headers: {
        ...commonHeaders(),
        Accept: "application/sparql-results+json",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const links: PartnerNetworkLink[] = [];
    const seen = new Set<string>();
    for (const row of data.results?.bindings ?? []) {
      const hubQid: string = row.hub.value.split("/").pop();
      const otherQid: string = row.other.value.split("/").pop();
      const key =
        hubQid < otherQid ? `${hubQid}:${otherQid}` : `${otherQid}:${hubQid}`;
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

  const [res, relatives, humanInfo, partnerNetworkResult] = await Promise.all([
    fetch(url, {
      headers: {
        ...commonHeaders(),
        Accept: "application/sparql-results+json",
      },
      next: { revalidate: 3600 },
    }).catch(() => null),
    fetchRelatives(resolved.qid),
    filterHumans([resolved.qid]),
    fetchPartnerNetwork(resolved.qid),
  ]);

  let partnerNetwork = partnerNetworkResult;

  const relationships: RelationshipEdge[] = [];
  const missingNames = new Set<string>();

  if (res && res.ok) {
    const data = await res.json();
    for (const row of data.results.bindings) {
      const partnerUrl: string = row.partner.value;
      const partnerLabel = row.partnerLabel?.value;
      const start = row.start?.value ?? null;
      const end = row.end?.value ?? null;

      // Skip blank nodes (genid URLs) - these are anonymous entities without proper QIDs
      if (partnerUrl.includes("/.well-known/genid/")) {
        continue; // Skip this relationship entirely
      }

      const partnerQid: string | undefined = partnerUrl.split("/").pop();

      // Check if it's a valid QID format (starts with Q followed by numbers)
      if (!partnerQid || !partnerQid.match(/^Q\d+$/)) {
        continue; // Skip invalid QIDs
      }

      // Check if we have a proper name, or if the label is missing/is a
      // QID (the SPARQL label service prints the QID itself when the item
      // is a redirect/merge target it can't label directly).
      let name = "Unknown";
      if (
        partnerLabel &&
        !partnerLabel.startsWith("http://") &&
        !partnerLabel.match(/^Q\d+$/) && // reject QID-shaped fallback labels
        partnerLabel.trim()
      ) {
        name = partnerLabel;
      } else {
        // Mark for name resolution - either missing label or label is just a QID
        missingNames.add(partnerQid);
      }

      relationships.push({
        partnerQid,
        name,
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

  // Resolve missing/QID-fallback names. First try the label service again
  // via a clean batch call, then fall back to wbgetentities (which follows
  // redirects) for anything still unresolved — this is what fixes names
  // like "Q34436" showing up instead of "Scarlett Johansson".
  if (missingNames.size > 0) {
    const nameMap = await resolveEntityNames(Array.from(missingNames));

    const stillMissing = Array.from(missingNames).filter(
      (q) => !nameMap.has(q)
    );
    if (stillMissing.length > 0) {
      const fallbackMap = await resolveNamesViaWbGetEntities(stillMissing);
      for (const [qid, label] of fallbackMap) nameMap.set(qid, label);
    }

    for (const rel of relationships) {
      if (
        rel.partnerQid &&
        (rel.name === "Unknown" || /^Q\d+$/.test(rel.name))
      ) {
        const resolvedName = nameMap.get(rel.partnerQid);
        if (resolvedName) {
          rel.name = resolvedName;
        }
      }
    }
  }

  // If a partner's name still couldn't be resolved after both attempts, it's
  // a dead/deleted Wikidata reference (the SPARQL endpoint has a stale
  // record for an item that's since been merged/removed on the live site,
  // with no redirect left behind) — not something we can resolve further.
  // Drop it rather than show "Unknown" or a raw QID to the user.
  const resolvedRelationships = relationships.filter(
    (rel) => rel.name !== "Unknown" && !/^Q\d+$/.test(rel.name)
  );

  // De-duplicate: the same partner can appear once as "partner" and again as
  // "spouse" (dated, then married). Keep the entry with the earliest start
  // date and merge the marriage flag in as the more specific type.
  const byPartner = new Map<string, RelationshipEdge>();
  for (const rel of resolvedRelationships) {
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
      // Prefer whichever of the two entries has a resolved (non-QID) name.
      name: /^Q\d+$/.test(earliest.name) ? rel.name : earliest.name,
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

  // Wikidata doesn't reliably record an end date for every relationship
  // that's actually over — a lot of past marriages simply have no P582
  // qualifier logged. Relying on "no end date" alone to mean "ongoing"
  // makes old relationships look current. Fix: only the chronologically
  // *last* relationship can be treated as ongoing when its end is missing;
  // any earlier one is necessarily over once a later one has started.
  const finalRelationships = dedupedRelationships.map((rel, idx) => {
    const isMostRecent = idx === dedupedRelationships.length - 1;
    if (!rel.end && !isMostRecent) {
      return { ...rel, ongoing: false };
    }
    return rel;
  });

  // Same redirect issue can show up in the partner-network graph (e.g. a
  // "hub" person whose QID was merged) — resolve any QID-shaped names there too.
  const networkUnresolved = new Set<string>();
  for (const link of partnerNetwork) {
    if (/^Q\d+$/.test(link.hubName)) networkUnresolved.add(link.hubQid);
    if (/^Q\d+$/.test(link.otherName)) networkUnresolved.add(link.otherQid);
  }
  if (networkUnresolved.size > 0) {
    const fallbackMap = await resolveNamesViaWbGetEntities(
      Array.from(networkUnresolved)
    );
    partnerNetwork = partnerNetwork.map((link) => ({
      ...link,
      hubName: fallbackMap.get(link.hubQid) ?? link.hubName,
      otherName: fallbackMap.get(link.otherQid) ?? link.otherName,
    }));
  }

  // Same reasoning as resolvedRelationships above: if a hub or other person
  // in the network graph still has no real name, it's a dead reference —
  // drop the link instead of rendering "Unknown" or a raw QID.
  partnerNetwork = partnerNetwork.filter(
    (link) =>
      link.hubName !== "Unknown" &&
      !/^Q\d+$/.test(link.hubName) &&
      link.otherName !== "Unknown" &&
      !/^Q\d+$/.test(link.otherName)
  );

  const info = humanInfo.get(resolved.qid);

  return {
    qid: resolved.qid,
    name: resolved.name,
    description: resolved.description,
    image: info?.image ?? null,
    wikipediaUrl: info?.wikipediaUrl ?? null,
    relationships: finalRelationships,
    relatives,
    partnerNetwork,
  };
}
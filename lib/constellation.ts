import type {
  ConstellationEdge,
  ConstellationGraph,
  ConstellationNode,
  PartnerNetworkLink,
  PersonRecord,
  RelationshipEdge,
} from "./types";
import { slugify } from "./utils";

const MAX_ORBIT_NODES = 18;

function nodeId(qid: string | null, name: string) {
  return qid ?? `name:${slugify(name)}`;
}

function undirectedKey(a: string, b: string) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/**
 * Build a dating constellation from the subject's Wikidata partners plus
 * one extra hop: each partner's other partners. Those orbit nodes are
 * people who share an ex (the hub) with the subject.
 */
export function buildConstellationGraph(
  person: Pick<PersonRecord, "qid" | "name" | "image" | "relationships">,
  partnerNetwork: PartnerNetworkLink[] = []
): ConstellationGraph {
  const subjectId = person.qid;
  const nodes = new Map<string, ConstellationNode>();
  const edgeMap = new Map<string, ConstellationEdge>();

  const addNode = (node: ConstellationNode) => {
    const existing = nodes.get(node.id);
    if (!existing) {
      nodes.set(node.id, node);
      return;
    }
    if (existing.role === "orbit" && node.role === "partner") {
      nodes.set(node.id, { ...existing, ...node, role: "partner" });
    } else if (!existing.image && node.image) {
      nodes.set(node.id, { ...existing, image: node.image });
    }
  };

  const addRelEdge = (
    source: string,
    target: string,
    rel: Pick<RelationshipEdge, "type" | "start" | "end" | "ongoing">
  ) => {
    if (source === target) return;
    const key = `rel:${undirectedKey(source, target)}`;
    const existing = edgeMap.get(key);
    if (existing) {
      edgeMap.set(key, {
        ...existing,
        type:
          existing.type === "spouse" || rel.type === "spouse"
            ? "spouse"
            : existing.type === "shared-ex"
              ? rel.type
              : existing.type,
        ongoing: existing.ongoing || rel.ongoing,
        end: rel.end || existing.end,
        start:
          !rel.start || (existing.start && existing.start < rel.start)
            ? existing.start
            : rel.start,
      });
      return;
    }
    edgeMap.set(key, {
      id: key,
      source,
      target,
      type: rel.type,
      kind: "relationship",
      start: rel.start,
      end: rel.end,
      ongoing: rel.ongoing,
    });
  };

  addNode({
    id: subjectId,
    name: person.name,
    image: person.image,
    role: "subject",
    slug: slugify(person.name),
  });

  for (const rel of person.relationships) {
    const id = nodeId(rel.partnerQid, rel.name);
    addNode({
      id,
      name: rel.name,
      image: rel.image,
      role: "partner",
      slug: slugify(rel.name),
    });
    addRelEdge(subjectId, id, rel);
  }

  const partnerIds = new Set(
    [...nodes.values()].filter((n) => n.role === "partner").map((n) => n.id)
  );

  const extras: PartnerNetworkLink[] = [];
  const seenOther = new Set<string>();
  for (const link of partnerNetwork) {
    if (!partnerIds.has(link.hubQid)) continue;
    if (link.otherQid === subjectId) continue;
    const otherId = link.otherQid;
    if (nodes.has(otherId) && nodes.get(otherId)!.role !== "orbit") {
      extras.push(link);
      continue;
    }
    if (seenOther.has(otherId)) {
      extras.push(link);
      continue;
    }
    seenOther.add(otherId);
    extras.push(link);
  }

  extras.sort((a, b) => Number(!!b.otherImage) - Number(!!a.otherImage));

  let orbitAdded = 0;
  for (const link of extras) {
    const already = nodes.get(link.otherQid);
    if (!already) {
      if (orbitAdded >= MAX_ORBIT_NODES) continue;
      addNode({
        id: link.otherQid,
        name: link.otherName,
        image: link.otherImage,
        role: "orbit",
        slug: slugify(link.otherName),
      });
      orbitAdded++;
    }
    if (!nodes.has(link.otherQid) || !nodes.has(link.hubQid)) continue;
    addRelEdge(link.hubQid, link.otherQid, {
      type: link.type,
      start: link.start,
      end: link.end,
      ongoing: !link.end,
    });
  }

  // Shared-ex chords: two people who both dated the same hub.
  const neighbors = new Map<string, Set<string>>();
  for (const edge of edgeMap.values()) {
    if (edge.kind !== "relationship") continue;
    if (!neighbors.has(edge.source)) neighbors.set(edge.source, new Set());
    if (!neighbors.has(edge.target)) neighbors.set(edge.target, new Set());
    neighbors.get(edge.source)!.add(edge.target);
    neighbors.get(edge.target)!.add(edge.source);
  }

  for (const [hubId, adjacent] of neighbors) {
    const hub = nodes.get(hubId);
    if (!hub || hub.role === "subject") continue;
    const list = [...adjacent];
    const dense = list.length > 8;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const nodeA = nodes.get(a);
        const nodeB = nodes.get(b);
        if (!nodeA || !nodeB) continue;
        if (
          dense &&
          nodeA.role !== "subject" &&
          nodeB.role !== "subject"
        ) {
          continue;
        }
        const relKey = `rel:${undirectedKey(a, b)}`;
        if (edgeMap.has(relKey)) continue;
        const shareKey = `share:${undirectedKey(a, b)}:${hubId}`;
        const pairKey = `share:${undirectedKey(a, b)}`;
        if (edgeMap.has(pairKey)) continue;
        edgeMap.set(pairKey, {
          id: shareKey,
          source: a,
          target: b,
          type: "shared-ex",
          kind: "shared-ex",
          viaName: hub.name,
          start: null,
          end: null,
          ongoing: false,
        });
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    edges: [...edgeMap.values()],
  };
}

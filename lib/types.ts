export type RelationshipType = "spouse" | "partner" | "engaged";
export type RelationshipSource = "wikidata" | "llm";

export interface RelationshipEdge {
  partnerQid: string | null; // null for LLM-sourced entries (no Wikidata ID)
  name: string;
  type: RelationshipType;
  start: string | null;
  end: string | null;
  ongoing: boolean;
  image: string | null;
  source: RelationshipSource; // NEW
  confidence: "confirmed" | "reported"; // NEW — "confirmed" = wikidata, "reported" = llm
}

export interface PartnerNetworkLink {
  hubQid: string;
  hubName: string;
  hubImage: string | null;
  otherQid: string;
  otherName: string;
  otherImage: string | null;
  type: RelationshipType;
  start: string | null;
  end: string | null;
}

export type ConstellationRole = "subject" | "partner" | "orbit";

export interface ConstellationNode {
  id: string;
  name: string;
  image: string | null;
  role: ConstellationRole;
  slug: string | null;
}

export interface ConstellationEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType | "shared-ex";
  kind: "relationship" | "shared-ex";
  viaName?: string;
  start: string | null;
  end: string | null;
  ongoing: boolean;
}

export interface ConstellationGraph {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
}

export interface PersonRecord {
  qid: string;
  name: string;
  description: string | null;
  image: string | null;
  wikipediaUrl: string | null;
  relationships: RelationshipEdge[];
  relatives?: string[];
  partnerNetwork?: PartnerNetworkLink[];
}

export interface RelationshipStats {
  totalRelationships: number;
  longest: RelationshipEdge | null;
  totalYearsTracked: number;
  overlaps: [RelationshipEdge, RelationshipEdge][];
}

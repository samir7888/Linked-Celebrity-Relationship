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

export interface PersonRecord {
  qid: string;
  name: string;
  description: string | null;
  image: string | null;
  wikipediaUrl: string | null;
  relationships: RelationshipEdge[];
  relatives?: string[];
}

export interface RelationshipStats {
  totalRelationships: number;
  longest: RelationshipEdge | null;
  totalYearsTracked: number;
  overlaps: [RelationshipEdge, RelationshipEdge][];
}

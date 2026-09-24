import type { RelationshipEdge, RelationshipStats } from "./types";
import { durationInYears, formatYear } from "./utils";

function rangesOverlap(a: RelationshipEdge, b: RelationshipEdge): boolean {
  const aStart = formatYear(a.start);
  const bStart = formatYear(b.start);
  if (!aStart || !bStart) return false;

  const currentYear = String(new Date().getFullYear());
  // If not ongoing and end is missing, assume it ended around start year + 1
  const aEnd =
    formatYear(a.end) ??
    (a.ongoing ? currentYear : String(parseInt(aStart, 10) + 1));
  const bEnd =
    formatYear(b.end) ??
    (b.ongoing ? currentYear : String(parseInt(bStart, 10) + 1));

  return (
    parseInt(aStart, 10) < parseInt(bEnd, 10) &&
    parseInt(bStart, 10) < parseInt(aEnd, 10)
  );
}

export function computeStats(
  relationships: RelationshipEdge[]
): RelationshipStats {
  let longest: RelationshipEdge | null = null;
  let longestYears = -1;
  let totalYearsTracked = 0;

  for (const rel of relationships) {
    const years = durationInYears(rel.start, rel.end, rel.ongoing);
    totalYearsTracked += years;
    if (years > longestYears) {
      longestYears = years;
      longest = rel;
    }
  }

  const overlaps: [RelationshipEdge, RelationshipEdge][] = [];
  for (let i = 0; i < relationships.length; i++) {
    for (let j = i + 1; j < relationships.length; j++) {
      if (rangesOverlap(relationships[i], relationships[j])) {
        overlaps.push([relationships[i], relationships[j]]);
      }
    }
  }

  return {
    totalRelationships: relationships.length,
    longest,
    totalYearsTracked: Math.round(totalYearsTracked * 10) / 10,
    overlaps,
  };
}

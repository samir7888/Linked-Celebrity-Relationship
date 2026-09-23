"use client";

import { useState, type ReactNode } from "react";
import { GitFork, ListTree } from "lucide-react";
import type { ConstellationGraph, RelationshipEdge } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Timeline } from "@/components/Timeline";
import { ConstellationView } from "@/components/ConstellationView";

type ViewMode = "timeline" | "constellation";

export function RelationshipViews({
  relationships,
  overlapPairs,
  constellation,
  subjectName,
}: {
  relationships: RelationshipEdge[];
  overlapPairs: Set<string>;
  constellation: ConstellationGraph;
  subjectName: string;
}) {
  const [view, setView] = useState<ViewMode>("timeline");

  return (
    <section className="mt-12 sm:mt-16">
      <div className="mb-5 flex flex-col gap-3 border-b border-line/80 pb-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl italic tracking-tight text-ink sm:text-3xl">
            {view === "timeline" ? "Relationship Timeline" : "Shared-ex Constellation"}
          </h2>
          <p className="mt-0.5 font-body text-xs text-ink-soft/75 sm:text-sm">
            {view === "timeline"
              ? "Chronological record of marriages, partnerships, and reported dating history."
              : "A living map of people connected because they share an ex — drag, pinch, and tap any star."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="font-body text-xs font-semibold text-gold tabular-nums sm:hidden">
            {relationships.length} recorded
          </span>
          <div className="inline-flex rounded-2xl border border-line/80 bg-white/70 p-1 shadow-xs backdrop-blur-md">
            <ViewTab
              active={view === "timeline"}
              onClick={() => setView("timeline")}
              icon={<ListTree size={13} />}
              label="Timeline"
            />
            <ViewTab
              active={view === "constellation"}
              onClick={() => setView("constellation")}
              icon={<GitFork size={13} />}
              label="Constellation"
            />
          </div>
          <span className="hidden font-body text-xs font-semibold text-gold tabular-nums sm:inline">
            {relationships.length} recorded
          </span>
        </div>
      </div>

      {view === "timeline" ? (
        <Timeline relationships={relationships} overlapPairs={overlapPairs} />
      ) : (
        <div className="sm:-mx-3 md:-mx-6">
          <ConstellationView graph={constellation} subjectName={subjectName} />
        </div>
      )}
    </section>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-body text-xs font-medium transition-all duration-200",
        active
          ? "bg-ink text-paper shadow-sm"
          : "text-ink-soft/80 hover:bg-ink/5 hover:text-ink"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

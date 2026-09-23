import type { RelationshipStats } from "@/lib/types";
import { Heart, Clock, Calendar, AlertCircle } from "lucide-react";

export function StatLedger({ stats }: { stats: RelationshipStats }) {
  const cards = [
    {
      label: "Total Relationships",
      value: String(stats.totalRelationships),
      sub: "Documented partners",
      icon: Heart,
      iconColor: "text-wine",
      bgColor: "bg-wine/[0.04]",
    },
    {
      label: "Longest Relationship",
      value: stats.longest ? `${Math.round(yearsOf(stats))} yrs` : "—",
      sub: stats.longest ? stats.longest.name : "None recorded",
      icon: Clock,
      iconColor: "text-gold",
      bgColor: "bg-gold/[0.06]",
    },
    {
      label: "Years Tracked",
      value: `${stats.totalYearsTracked || "—"}`,
      sub: stats.totalYearsTracked ? "Span of public history" : "Not applicable",
      icon: Calendar,
      iconColor: "text-sage",
      bgColor: "bg-sage/[0.06]",
    },
    {
      label: "Concurrent Overlaps",
      value: stats.overlaps.length > 0 ? String(stats.overlaps.length) : "0",
      sub: stats.overlaps.length > 0 ? "Timeline overlaps" : "No overlaps detected",
      icon: AlertCircle,
      iconColor: stats.overlaps.length > 0 ? "text-amber-600" : "text-ink-soft/40",
      bgColor: stats.overlaps.length > 0 ? "bg-amber-500/[0.08]" : "bg-ink/[0.02]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-line/80 bg-white/70 p-3.5 sm:p-4.5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-white hover:shadow-[0_8px_20px_-6px_rgba(27,26,34,0.06)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-[11px] font-medium uppercase tracking-wider text-ink-soft/60">
                {card.label}
              </span>
              <div className={`rounded-full p-1.5 ${card.bgColor}`}>
                <Icon size={14} className={card.iconColor} />
              </div>
            </div>
            <div
              className="mt-2.5 truncate font-display text-2xl italic tracking-tight text-ink sm:text-3xl"
              title={card.value}
            >
              {card.value}
            </div>
            <p className="mt-1 truncate font-body text-xs text-ink-soft/75">
              {card.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function yearsOf(stats: RelationshipStats): number {
  if (!stats.longest) return 0;
  const start = stats.longest.start ? parseInt(stats.longest.start.slice(0, 4)) : null;
  if (!start) return 0;
  const end = stats.longest.end ? parseInt(stats.longest.end.slice(0, 4)) : new Date().getFullYear();
  return Math.max(end - start, 0);
}

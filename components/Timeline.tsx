"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Users,
  Sparkles,
  ArrowUpRight,
  ArrowDownUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type { RelationshipEdge } from "@/lib/types";
import {
  cn,
  durationInYears,
  formatDuration,
  formatYear,
  slugify,
} from "@/lib/utils";

const MAX_BAR_YEARS = 12;

type FilterType = "all" | "spouse" | "partner" | "ongoing";
type SortOrder = "asc" | "desc";

export function Timeline({
  relationships,
  overlapPairs,
}: {
  relationships: RelationshipEdge[];
  overlapPairs: Set<string>;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const filteredAndSorted = useMemo(() => {
    let list = [...relationships];

    if (filter === "spouse") {
      list = list.filter((r) => r.type === "spouse");
    } else if (filter === "partner") {
      list = list.filter((r) => r.type === "partner" || (r.type as any) === "dating");
    } else if (filter === "ongoing") {
      list = list.filter((r) => r.ongoing);
    }

    list.sort((a, b) => {
      const yearA = a.start ? parseInt(a.start.slice(0, 4), 10) || 0 : 0;
      const yearB = b.start ? parseInt(b.start.slice(0, 4), 10) || 0 : 0;
      return sortOrder === "asc" ? yearA - yearB : yearB - yearA;
    });

    return list;
  }, [relationships, filter, sortOrder]);

  const spouseCount = relationships.filter((r) => r.type === "spouse").length;
  const partnerCount = relationships.filter(
    (r) => r.type === "partner" || (r.type as any) === "dating"
  ).length;
  const ongoingCount = relationships.filter((r) => r.ongoing).length;

  if (relationships.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-dashed border-line/90 bg-white/40 px-4 py-12 text-center backdrop-blur-sm sm:px-12 sm:py-16">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold sm:h-14 sm:w-14">
          <Calendar size={22} className="sm:h-6 sm:w-6" />
        </div>
        <h3 className="mt-3 font-display text-lg italic text-ink sm:text-xl">
          No publicly recorded relationships found
        </h3>
        <p className="mx-auto mt-1.5 max-w-md font-body text-xs leading-relaxed text-ink-soft/75 sm:text-sm">
          There are no documented dating or marriage records in Wikidata or
          major entertainment archives for this person.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls Bar: Filters & Sort */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-line/70 bg-white/60 p-2 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "shrink-0 rounded-xl px-2.5 py-1.5 font-body text-xs font-medium transition-all sm:px-3",
              filter === "all"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-soft/80 hover:bg-ink/5 hover:text-ink"
            )}
          >
            All ({relationships.length})
          </button>
          {spouseCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("spouse")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 font-body text-xs font-medium transition-all sm:px-3",
                filter === "spouse"
                  ? "bg-wine text-paper shadow-sm"
                  : "text-ink-soft/80 hover:bg-wine/10 hover:text-wine"
              )}
            >
              <Heart size={11} className={filter === "spouse" ? "fill-paper" : ""} />
              Spouses ({spouseCount})
            </button>
          )}
          {partnerCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("partner")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 font-body text-xs font-medium transition-all sm:px-3",
                filter === "partner"
                  ? "bg-gold text-paper shadow-sm"
                  : "text-ink-soft/80 hover:bg-gold/10 hover:text-gold"
              )}
            >
              <Users size={11} />
              Dating ({partnerCount})
            </button>
          )}
          {ongoingCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("ongoing")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-body text-xs font-medium transition-all sm:px-3",
                filter === "ongoing"
                  ? "bg-emerald-800 text-paper shadow-sm"
                  : "text-ink-soft/80 hover:bg-emerald-50 hover:text-emerald-800"
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Ongoing ({ongoingCount})
            </button>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line/60 bg-paper/60 px-2.5 py-1.5 font-body text-xs font-medium text-ink-soft transition-all hover:border-line hover:bg-white hover:text-ink sm:px-3"
          >
            <ArrowDownUp size={12} />
            {sortOrder === "asc" ? "Oldest First" : "Newest First"}
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-24">
        {/* Animated illuminated spine */}
        <motion.div
          aria-hidden
          className="spine absolute left-[7px] sm:left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-gold via-wine/60 to-gold/40"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: relationships.length * 0.12 + 0.3,
            ease: "easeInOut",
          }}
        />

        <AnimatePresence mode="popLayout">
          <ol className="flex flex-col gap-4 sm:gap-6">
            {filteredAndSorted.map((rel, i) => (
              <TimelineRow
                key={`${rel.partnerQid || rel.name}-${rel.start}-${i}`}
                rel={rel}
                index={i}
                overlapping={overlapPairs.has(rel.partnerQid || "")}
              />
            ))}
          </ol>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TimelineRow({
  rel,
  index,
  overlapping,
}: {
  rel: RelationshipEdge;
  index: number;
  overlapping: boolean;
}) {
  const years = durationInYears(rel.start, rel.end);
  const barPercent = Math.min((years / MAX_BAR_YEARS) * 100, 100);
  const startYear = formatYear(rel.start) ?? "—";
  const isReported = rel.confidence === "reported";
  const isSpouse = rel.type === "spouse";
  const partnerSlug = slugify(rel.name);

  return (
    <motion.li
      className="relative"
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        delay: Math.min(index * 0.06, 0.35),
        duration: 0.35,
        ease: "easeOut",
      }}
    >
      {/* Year Label: Desktop Gutter */}
      <span
        aria-hidden
        className="hidden sm:block absolute -left-24 top-4 w-16 text-right font-display text-base font-semibold tabular-nums text-gold"
      >
        {startYear}
      </span>

      {/* Node Dot on Spine */}
      <span
        aria-hidden
        className={cn(
          "absolute -left-[1.45rem] sm:-left-[4.45rem] top-4.5 h-3 w-3 sm:h-3.5 sm:w-3.5 -translate-x-1/2 rounded-full border-2 border-paper transition-all duration-300",
          isSpouse
            ? "bg-wine shadow-[0_0_8px_rgba(140,31,59,0.5)]"
            : "bg-gold shadow-[0_0_8px_rgba(184,148,79,0.5)]",
          isReported && "ring-1 ring-ink-soft/40"
        )}
      />

      {/* Responsive Timeline Card */}
      <div
        className={cn(
          "group relative flex items-start gap-3 rounded-2xl border bg-white/85 p-3.5 shadow-[0_2px_10px_-3px_rgba(27,26,34,0.05)] backdrop-blur-md transition-all duration-300 hover:border-gold/50 hover:bg-white hover:shadow-[0_8px_24px_-4px_rgba(27,26,34,0.09)] sm:gap-4 sm:p-4.5",
          isReported ? "border-line/80" : "border-line",
          overlapping && "ring-1 ring-amber-500/30"
        )}
      >
        {/* Partner Avatar */}
        <Link
          href={`/celebrity/${partnerSlug}`}
          title={`View ${rel.name}'s timeline`}
          className="group/avatar relative h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl bg-ink/5 ring-1.5 ring-line/60 transition-transform duration-300 hover:scale-105 hover:ring-gold"
        >
          {rel.image ? (
            <Image
              src={rel.image}
              alt={rel.name}
              fill
              sizes="(max-width: 640px) 48px, 64px"
              className="object-cover transition-transform duration-500 group-hover/avatar:scale-110"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paper to-line/50 font-display text-base italic text-ink-soft/60 sm:text-xl">
              {rel.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-ink/0 transition-colors group-hover/avatar:bg-ink/10" />
        </Link>

        {/* Content Details */}
        <div className="min-w-0 flex-1">
          {/* Header Row: Name & Mobile Year Pill */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <Link
              href={`/celebrity/${partnerSlug}`}
              className="group/link inline-flex items-center gap-1 font-display text-base font-medium text-ink transition-colors hover:text-wine sm:text-lg"
            >
              <span className="truncate max-w-[160px] sm:max-w-none">{rel.name}</span>
              <ArrowUpRight
                size={13}
                className="opacity-0 transition-all duration-200 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 text-wine shrink-0"
              />
            </Link>

            {/* Mobile Year Badge */}
            <span className="sm:hidden rounded-md bg-gold/10 px-1.5 py-0.5 font-display text-[11px] font-semibold text-gold tabular-nums">
              {startYear}
            </span>
          </div>

          {/* Badges Row */}
          <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-1.5">
            <TypeTag type={rel.type} />

            {rel.ongoing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-body text-[10px] font-medium text-emerald-800 ring-1 ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Current
              </span>
            )}

            {overlapping && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 font-body text-[10px] font-medium text-amber-700 ring-1 ring-amber-500/20">
                <AlertTriangle size={10} />
                Concurrent
              </span>
            )}

            {isReported ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-ink/[0.04] px-1.5 py-0.5 font-body text-[9px] font-medium text-ink-soft/75 ring-1 ring-ink-soft/15">
                <Sparkles size={9} className="text-gold" />
                Reported
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-wine/[0.04] px-1.5 py-0.5 font-body text-[9px] font-medium text-wine/80 ring-1 ring-wine/15">
                <CheckCircle2 size={9} />
                Wikidata
              </span>
            )}
          </div>

          {/* Time range & duration */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-soft sm:text-xs">
            <span className="font-body font-medium text-ink/80">
              {formatDuration(rel.start, rel.end)}
            </span>
          </div>

          {/* Graphical Duration Indicator Bar */}
          <div className="mt-2.5 flex items-center gap-2.5 sm:mt-3 sm:gap-3">
            <div className="relative h-1.5 sm:h-2 w-full max-w-[180px] sm:max-w-[240px] overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isSpouse
                    ? "bg-gradient-to-r from-wine-deep via-wine to-rose-400"
                    : "bg-gradient-to-r from-amber-700 via-gold to-yellow-300"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(barPercent, 8)}%` }}
                transition={{
                  delay: Math.min(index * 0.06, 0.35) + 0.15,
                  duration: 0.5,
                  ease: "easeOut",
                }}
              />
            </div>
            <span className="font-body text-[10px] sm:text-[11px] tabular-nums text-ink-soft/60">
              {years >= 1 ? `${Math.round(years * 10) / 10}y` : "<1y"}
            </span>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function TypeTag({ type }: { type: RelationshipEdge["type"] }) {
  const isSpouse = type === "spouse";
  const isEngaged = (type as any) === "engaged";

  if (isSpouse) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-wine/10 px-2 py-0.5 font-body text-[10px] sm:text-xs font-semibold text-wine ring-1 ring-wine/20">
        <Heart size={10} className="fill-wine" />
        Married
      </span>
    );
  }

  if (isEngaged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 font-body text-[10px] sm:text-xs font-semibold text-purple-700 ring-1 ring-purple-500/20">
        <Sparkles size={10} />
        Engaged
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-body text-[10px] sm:text-xs font-semibold text-amber-900 ring-1 ring-gold/30">
      <Users size={10} />
      Dating
    </span>
  );
}

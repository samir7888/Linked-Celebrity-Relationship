import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Compass,
} from "lucide-react";
import { computeStats } from "@/lib/stats";
import { slugify, unslugify } from "@/lib/utils";
import { StatLedger } from "@/components/StatLedger";
import { RelationshipViews } from "@/components/RelationshipViews";
import { buildConstellationGraph } from "@/lib/constellation";
import { SearchForm } from "@/components/SearchForm";
import { ShareButton } from "@/components/ShareButton";
import { fetchPersonRecord } from "@/lib/wikidata";
import { fetchLLMRelationships } from "@/lib/llm";
import { mergeRelationships } from "@/lib/merge";
import { TRENDING_NAMES } from "@/lib/trending";

interface Props {
  params: { slug: string };
}

const getPerson = cache(async (slug: string) => {
  const name = unslugify(slug);

  console.log("[PAGE] Fetching person record for:", name);

  try {
    const record = await fetchPersonRecord(name);
    if (!record) {
      console.log("[PAGE] No Wikidata record found for:", name);
      return null;
    }

    console.log("[PAGE] Wikidata record found:", record.name, "— now calling LLM...");

    const knownNames = record.relationships.map((r) => r.name);
    const relatives = record.relatives ?? [];
    const [llmResult] = await Promise.allSettled([
      fetchLLMRelationships(record.name, knownNames, relatives),
    ]);
    const llmEdges = llmResult.status === "fulfilled" ? llmResult.value : [];

    console.log("[PAGE] LLM returned", llmEdges.length, "edge(s)");

    return {
      ...record,
      relationships: mergeRelationships(record.relationships, llmEdges, [
        record.name,
        ...relatives,
      ]),
    };
  } catch (error) {
    console.error("[PAGE] Failed to fetch person data:", error);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPerson(params.slug);
  if (!person) {
    return { title: "Not found" };
  }
  const count = person.relationships.length;
  const description = person.description
    ? `${person.name}, ${
        person.description
      }. See ${count} recorded relationship${
        count === 1 ? "" : "s"
      } on a timeline — who, when, and for how long.`
    : `See ${person.name}'s recorded relationship history on a timeline — who, when, and for how long.`;

  return {
    title: `${person.name}'s relationship timeline — Linked`,
    description,
    alternates: { canonical: `/celebrity/${params.slug}` },
    openGraph: {
      title: `${person.name}'s relationship timeline — Linked`,
      description,
      images: person.image ? [{ url: person.image }] : undefined,
    },
  };
}

export default async function CelebrityPage({ params }: Props) {
  const person = await getPerson(params.slug);
  if (!person) notFound();

  const stats = computeStats(person.relationships);
  const overlapPartnerIds = new Set(
    stats.overlaps
      .flatMap(([a, b]) => [a.partnerQid, b.partnerQid])
      .filter((id): id is string => id !== null)
  );

  const constellation = buildConstellationGraph(
    person,
    person.partnerNetwork ?? []
  );

  const otherCelebrities = TRENDING_NAMES.filter(
    (n) => slugify(n) !== params.slug
  ).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    description: person.description ?? undefined,
    image: person.image ?? undefined,
    sameAs: person.wikipediaUrl ?? undefined,
    spouse: person.relationships
      .filter((r) => r.type === "spouse")
      .map((r) => ({ "@type": "Person", name: r.name })),
  };

  return (
    <main className="min-h-screen bg-paper pb-20 selection:bg-gold/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ambient background glow accents */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute top-60 -left-20 h-80 w-80 rounded-full bg-wine/5 blur-3xl" />
      </div>

      {/* Floating Glassmorphic Header */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-display text-base italic text-ink transition-colors hover:text-wine"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white/80 text-ink transition-transform group-hover:-translate-x-0.5 group-hover:border-wine/50">
              <ArrowLeft size={13} />
            </span>
            <span className="font-semibold tracking-tight">Linked</span>
          </Link>

          <div className="hidden max-w-xs flex-1 sm:block md:max-w-sm">
            <SearchForm tone="light" />
          </div>

          <div className="flex items-center gap-2">
            <ShareButton name={person.name} />
            {person.wikipediaUrl && (
              <a
                href={person.wikipediaUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1 rounded-full border border-line/70 bg-white/70 px-3 py-1.5 font-body text-xs font-medium text-ink-soft shadow-xs backdrop-blur-sm transition-all hover:border-line hover:bg-white hover:text-ink md:inline-flex"
              >
                <span>Wikipedia</span>
                <ExternalLink size={11} className="text-ink-soft/70" />
              </a>
            )}
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="border-t border-line/50 px-4 py-2 sm:hidden">
          <SearchForm tone="light" />
        </div>
      </header>

      {/* Main Content Container */}
      <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 sm:pt-12">
        {/* Editorial Profile Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-b from-white/90 via-white/70 to-paper p-4 shadow-[0_8px_30px_-10px_rgba(27,26,34,0.06)] backdrop-blur-sm sm:rounded-3xl sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
            {/* Celebrity Portrait */}
            <div className="relative shrink-0">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-ink/5 p-1 ring-2 ring-line/80 shadow-md sm:h-28 sm:w-28 sm:rounded-3xl">
                {person.image ? (
                  <Image
                    src={person.image}
                    alt={person.name}
                    fill
                    sizes="(max-width: 640px) 80px, 112px"
                    className="rounded-[14px] object-cover object-top sm:rounded-[20px]"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-paper to-line/60 font-display text-3xl italic text-ink-soft/40 sm:rounded-[20px] sm:text-4xl">
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Status Badge Pin */}
              <div
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper bg-wine text-white shadow-sm sm:h-7 sm:w-7"
                title="Public Verified Archive"
              >
                <ShieldCheck size={12} className="sm:h-3.5 sm:w-3.5" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-0.5 font-body text-[10px] font-medium text-amber-900 ring-1 ring-gold/20 sm:text-[11px]">
                <Sparkles size={10} className="text-gold" />
                Celebrity Relationship Archive
              </div>

              <h1 className="mt-1.5 text-balance font-display text-2xl italic tracking-tight text-ink sm:text-4xl md:text-5xl">
                {person.name}
              </h1>

              {person.description && (
                <p className="mt-1 font-body text-xs capitalize text-ink-soft sm:mt-1.5 sm:text-base">
                  {person.description}
                </p>
              )}

              {/* External source pill */}
              {person.wikipediaUrl && (
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:mt-3.5 sm:justify-start">
                  <a
                    href={person.wikipediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-body text-xs text-wine underline underline-offset-4 transition-colors hover:text-wine-deep"
                  >
                    <span>View encyclopedia entry on Wikipedia</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Ledger Statistics Cards */}
        <section className="mt-6 sm:mt-8">
          <StatLedger stats={stats} />
        </section>

        <RelationshipViews
          relationships={person.relationships}
          overlapPairs={overlapPartnerIds}
          constellation={constellation}
          subjectName={person.name}
        />

        {/* Explore Other Celebrities */}
        <section className="mt-16 rounded-3xl border border-line/80 bg-white/60 p-6 backdrop-blur-sm sm:p-8">
          <div className="flex items-center gap-2 text-ink">
            <Compass size={18} className="text-gold" />
            <h3 className="font-display text-lg italic sm:text-xl">
              Explore More Relationship Timelines
            </h3>
          </div>
          <p className="mt-1 font-body text-xs text-ink-soft/70">
            Discover dating histories and relationship timelines of other popular public figures.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {otherCelebrities.map((name) => (
              <Link
                key={name}
                href={`/celebrity/${slugify(name)}`}
                className="group inline-flex items-center gap-2 rounded-2xl border border-line/70 bg-paper/70 px-3.5 py-2 font-body text-xs font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:bg-white hover:shadow-xs"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/5 font-display text-[10px] italic text-ink-soft transition-colors group-hover:bg-wine/10 group-hover:text-wine">
                  {name.charAt(0)}
                </span>
                <span>{name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Dataset Methodology & Disclaimer */}
        <footer className="mt-12 border-t border-line/60 pt-6">
          <div className="rounded-2xl bg-ink/[0.02] p-4 text-ink-soft/70">
            <p className="font-body text-[11px] leading-relaxed">
              <strong>Data provenance:</strong> Names, dates, and media records are compiled
              from Wikidata&rsquo;s public knowledge graph and cross-verified against
              mainstream press reports. Private relationships that were never publicized may not
              appear. Corrections can be submitted directly to Wikidata.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

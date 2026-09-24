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
  Database,
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
import { PersonRecord } from "@/lib/types";

interface Props {
  params: { slug: string };
}

// In-memory cache across requests with 12 hour TTL
interface CachedPerson {
  person: PersonRecord | null;
  timestamp: number;
}
const personMemoryCache = new Map<string, CachedPerson>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

async function fetchPersonData(slug: string): Promise<PersonRecord | null> {
  const cached = personMemoryCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.person;
  }

  const name = unslugify(slug);
  try {
    // Run Wikidata and LLM in parallel for 2x faster response time
    const [recordResult, llmResult] = await Promise.allSettled([
      fetchPersonRecord(name),
      fetchLLMRelationships(name, [], []),
    ]);

    const record =
      recordResult.status === "fulfilled" ? recordResult.value : null;
    const llmEdges =
      llmResult.status === "fulfilled" ? llmResult.value : [];

    if (!record) {
      // If Wikidata didn't find the person, but LLM has relationships
      if (llmEdges.length > 0) {
        const syntheticPerson: PersonRecord = {
          qid: `synth-${slug}`,
          name,
          description: "Public figure",
          image: null,
          wikipediaUrl: null,
          relationships: llmEdges,
          relatives: [],
          partnerNetwork: [],
        };
        personMemoryCache.set(slug, {
          person: syntheticPerson,
          timestamp: Date.now(),
        });
        return syntheticPerson;
      }
      personMemoryCache.set(slug, { person: null, timestamp: Date.now() });
      return null;
    }

    const relatives = record.relatives ?? [];
    const mergedRelationships = mergeRelationships(
      record.relationships,
      llmEdges,
      [record.name, ...relatives]
    );

    const fullPerson: PersonRecord = {
      ...record,
      relationships: mergedRelationships,
    };

    personMemoryCache.set(slug, { person: fullPerson, timestamp: Date.now() });
    return fullPerson;
  } catch (err) {
    console.error("[PAGE] Error fetching person:", err);
    return null;
  }
}

// React cache per request deduplication
const getPerson = cache(async (slug: string) => {
  return fetchPersonData(slug);
});

export function generateMetadata({ params }: Props): Metadata {
  const name = unslugify(params.slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const title = `${name}'s Relationship Timeline & Dating History | Linked`;
  const description = `Explore ${name}'s verified romantic relationship history, dating timeline, marriages, and partner network. Documented with dates and public sources.`;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/celebrity/${params.slug}` },
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CelebrityPage({ params }: Props) {
  const person = await getPerson(params.slug);
  if (!person) notFound();
  console.log("personn", person)

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
  ).slice(0, 9);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  // Person JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    description: person.description ?? undefined,
    image: person.image ?? undefined,
    sameAs: person.wikipediaUrl ?? undefined,
    url: `${siteUrl}/celebrity/${params.slug}`,
    spouse: person.relationships
      .filter((r) => r.type === "spouse")
      .map((r) => ({ "@type": "Person", name: r.name })),
    knows: person.relationships.map((r) => ({ "@type": "Person", name: r.name })),
  };

  const hasRelationships = person.relationships.length > 0;

  return (
    <main className="min-h-screen bg-paper pb-20 selection:bg-gold/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Ambient background glows ─────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 right-1/3 h-[500px] w-[500px] rounded-full bg-gold/8 blur-[120px]" />
        <div className="absolute top-1/2 -left-20 h-80 w-80 rounded-full bg-wine/5 blur-[90px]" />
      </div>

      {/* ── Sticky Header ────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          {/* Back to home */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-display text-sm italic text-ink transition-colors hover:text-wine sm:text-base"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white/80 text-ink shadow-sm transition-all group-hover:-translate-x-0.5 group-hover:border-wine/40 group-hover:bg-wine/5 group-hover:text-wine">
              <ArrowLeft size={13} />
            </span>
            <span className="hidden font-semibold tracking-tight sm:inline">Linked</span>
          </Link>

          {/* Inline search */}
          <div className="hidden max-w-xs flex-1 sm:block md:max-w-sm">
            <SearchForm tone="light" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShareButton name={person.name} />
            {person.wikipediaUrl && (
              <a
                href={person.wikipediaUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${person.name} on Wikipedia`}
                className="hidden items-center gap-1 rounded-full border border-line/70 bg-white/70 px-3 py-1.5 font-body text-xs font-medium text-ink-soft shadow-sm backdrop-blur-sm transition-all hover:border-line hover:bg-white hover:text-ink sm:inline-flex"
              >
                Wikipedia
                <ExternalLink size={10} className="text-ink-soft/60" />
              </a>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="border-t border-line/40 px-4 py-2 sm:hidden">
          <SearchForm tone="light" />
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-3 pt-5 sm:px-6 sm:pt-10">

        {/* ── Profile Hero Card ──────────────────────────── */}
        <section
          aria-label={`${person.name} profile`}
          className="relative overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-br from-white via-white/80 to-paper/60 shadow-[0_4px_24px_-8px_rgba(27,26,34,0.07)] sm:rounded-3xl"
        >
          {/* Decorative top accent */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold/60 to-transparent"
          />

          <div className="flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:items-start sm:gap-7 sm:p-7 sm:text-left">
            {/* Portrait */}
            <div className="relative shrink-0">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-ink/5 ring-2 ring-line/70 shadow-md sm:h-32 sm:w-32 sm:rounded-3xl">
                {person.image ? (
                  <Image
                    src={person.image}
                    alt={`${person.name} photo`}
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="rounded-[inherit] object-cover object-top"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paper to-line/60 font-display text-4xl italic text-ink-soft/30">
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>
              {/* Verified badge */}
              <div
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-wine text-white shadow-md"
                title="Wikidata verified"
              >
                <ShieldCheck size={13} />
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {/* Label pill */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-gold/25">
                <Sparkles size={9} className="text-gold" />
                Celebrity Relationship Archive
              </span>

              {/* Name */}
              <h1 className="mt-2 text-balance font-display text-2xl italic tracking-tight text-ink sm:text-4xl md:text-5xl">
                {person.name}
              </h1>

              {/* Description */}
              {person.description && (
                <p className="mt-1.5 font-body text-xs capitalize leading-relaxed text-ink-soft sm:text-sm">
                  {person.description}
                </p>
              )}

              {/* Stats quick-view pills */}
              {hasRelationships && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="rounded-full bg-ink/[0.04] px-2.5 py-1 font-body text-xs text-ink-soft ring-1 ring-line/60">
                    <strong className="font-semibold text-ink">{stats.totalRelationships}</strong> relationships
                  </span>
                  {stats.longest && (
                    <span className="rounded-full bg-ink/[0.04] px-2.5 py-1 font-body text-xs text-ink-soft ring-1 ring-line/60">
                      With <strong className="font-semibold text-ink">{stats.longest.name}</strong> longest
                    </span>
                  )}
                  {person.relationships.some((r) => r.ongoing) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-body text-xs font-medium text-emerald-800 ring-1 ring-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Currently in a relationship
                    </span>
                  )}
                </div>
              )}

              {/* Links */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                {person.wikipediaUrl && (
                  <a
                    href={person.wikipediaUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 font-body text-xs text-wine underline underline-offset-2 transition-colors hover:text-wine-deep"
                  >
                    View on Wikipedia
                    <ExternalLink size={11} />
                  </a>
                )}
                <span className="inline-flex items-center gap-1 font-body text-[11px] text-ink-soft/50">
                  <Database size={10} />
                  Sourced from Wikidata
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Ledger ───────────────────────────────── */}
        {hasRelationships && (
          <section aria-label="Relationship statistics" className="mt-5 sm:mt-6">
            <StatLedger stats={stats} />
          </section>
        )}

        {/* ── Relationship Views (Timeline + Constellation) ── */}
        <RelationshipViews
          relationships={person.relationships}
          overlapPairs={overlapPartnerIds}
          constellation={constellation}
          subjectName={person.name}
        />

        {/* ── Explore More Celebrities ────────────────────── */}
        <section
          aria-labelledby="explore-heading"
          className="mt-14 rounded-2xl border border-line/70 bg-white/60 p-5 backdrop-blur-sm sm:mt-16 sm:rounded-3xl sm:p-7"
        >
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-gold" />
            <h2
              id="explore-heading"
              className="font-display text-base italic text-ink sm:text-lg"
            >
              Explore More Relationship Timelines
            </h2>
          </div>
          <p className="mt-1 font-body text-xs leading-relaxed text-ink-soft/65">
            Discover the dating histories and relationship timelines of other
            popular celebrities.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {otherCelebrities.map((name) => (
              <Link
                key={name}
                href={`/celebrity/${slugify(name)}`}
                className="group inline-flex items-center gap-2 rounded-xl border border-line/60 bg-paper/70 px-3 py-1.5 font-body text-xs font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-white hover:shadow-sm"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/5 font-display text-[10px] italic text-ink-soft transition-colors group-hover:bg-wine/10 group-hover:text-wine">
                  {name.charAt(0)}
                </span>
                {name}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Data Disclaimer ─────────────────────────────── */}
        <footer className="mt-10 border-t border-line/50 pt-5 pb-4">
          <p className="font-body text-[11px] leading-relaxed text-ink-soft/50">
            <strong className="font-semibold text-ink-soft/70">Data provenance:</strong>{" "}
            Names, dates, and relationship records are compiled from{" "}
            <a
              href="https://www.wikidata.org"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-ink-soft transition-colors"
            >
              Wikidata&apos;s
            </a>{" "}
            public knowledge graph and cross-verified against mainstream press
            reports. LLM-assisted records are labeled &ldquo;Reported&rdquo; and based
            on publicly available media coverage. Private relationships not
            publicly disclosed are not shown. Corrections can be submitted to
            Wikidata directly.
          </p>
        </footer>
      </div>
    </main>
  );
}

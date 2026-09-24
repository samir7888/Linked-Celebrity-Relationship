import { redirect } from "next/navigation";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { slugify } from "@/lib/utils";
import { TRENDING_NAMES } from "@/lib/trending";
import {
  Clock,
  ShieldCheck,
  Star,
  TrendingUp,
  ChevronDown,
  Heart,
  Database,
  Search,
  ArrowRight,
} from "lucide-react";

const EXAMPLES = TRENDING_NAMES.slice(0, 6);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

const homepageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Linked — Celebrity Relationship Timelines",
  url: siteUrl,
  description:
    "Search any celebrity and see their full relationship history laid out as a timeline — who they dated, who they married, when it started and how long it lasted.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/celebrity/{search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does Linked get celebrity relationship data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Linked pulls data from Wikidata, the free, publicly editable structured knowledge base that powers Wikipedia. Every relationship listed is sourced from verified public records.",
      },
    },
    {
      "@type": "Question",
      name: "Is the relationship data on Linked accurate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All data comes from Wikidata's public knowledge graph and is cross-referenced against mainstream press reports. We clearly label any gaps where dates are not publicly known, rather than guessing.",
      },
    },
    {
      "@type": "Question",
      name: "Can I search for any celebrity?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can search for any well-known public figure in Wikidata. This includes actors, musicians, athletes, politicians, and other public personalities who have documented relationship histories.",
      },
    },
    {
      "@type": "Question",
      name: "How is Linked different from other celebrity gossip sites?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Linked is a factual, timeline-based archive — not a gossip site. We display verified, sourced information in chronological order without speculation. Every record links back to its original source in Wikidata.",
      },
    },
    {
      "@type": "Question",
      name: "Is Linked free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Linked is completely free to use. You can search any celebrity and view their full relationship timeline at no cost.",
      },
    },
    {
      "@type": "Question",
      name: "How do I search for a celebrity on Linked?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Simply type a celebrity's name into the search bar on the homepage and press 'Trace'. You'll be taken directly to their relationship timeline page.",
      },
    },
  ],
};

export default function HomePage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = searchParams?.q?.trim();
  if (q) {
    redirect(`/celebrity/${slugify(q)}`);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-paper">
        {/* ── SITE HEADER / NAV ─────────────────────────────── */}
        <header className="border-b border-line/60 bg-paper/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/"
              aria-label="Linked home"
              className="font-display text-xl italic font-semibold tracking-tight text-ink hover:text-wine transition-colors"
            >
              Linked
            </Link>
            <nav aria-label="Site navigation" className="flex items-center gap-5">
              <Link
                href="#how-it-works"
                className="font-body text-sm text-ink-soft hover:text-ink transition-colors hidden sm:block"
              >
                How it works
              </Link>
              <Link
                href="#trending"
                className="font-body text-sm text-ink-soft hover:text-ink transition-colors hidden sm:block"
              >
                Trending
              </Link>
              <Link
                href="#faq"
                className="font-body text-sm text-ink-soft hover:text-ink transition-colors hidden sm:block"
              >
                FAQ
              </Link>
            </nav>
          </div>
        </header>

        <main id="main-content">
          {/* ── HERO ──────────────────────────────────────────── */}
          <section
            aria-labelledby="hero-heading"
            className="relative overflow-hidden bg-ink px-6 py-24 sm:py-36"
          >
            {/* Dot grid texture */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, #F6F2EA 1px, transparent 0)",
                backgroundSize: "28px 28px",
              }}
            />
            {/* Ambient glows */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-wine/20 blur-[100px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-gold/15 blur-[90px]"
            />

            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-body text-xs tracking-wide text-gold">
                <Star size={11} />
                A public record, laid out plainly
              </p>

              <h1
                id="hero-heading"
                className="mt-6 text-balance font-display text-5xl italic leading-[1.05] text-paper sm:text-6xl lg:text-7xl"
              >
                Every celebrity relationship,{" "}
                <span className="text-gold">in order.</span>
              </h1>

              <p className="mt-6 max-w-xl text-balance font-body text-base leading-relaxed text-paper/65 sm:text-lg">
                Search any famous name and instantly see who they dated, who
                they married, when it started, and how long it lasted — all on
                one clean, chronological timeline.
              </p>

              <div className="mt-10 w-full max-w-lg">
                <SearchForm tone="dark" />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm">
                <span className="text-paper/40">Try:</span>
                {EXAMPLES.map((name) => (
                  <Link
                    key={name}
                    href={`/celebrity/${slugify(name)}`}
                    className="mark-underline font-body text-paper/70 transition-colors hover:text-paper"
                  >
                    {name}
                  </Link>
                ))}
              </div>

              {/* Scroll cue */}
              <div className="mt-14 flex flex-col items-center gap-1 text-paper/30">
                <span className="font-body text-xs">Scroll to explore</span>
                <ChevronDown size={16} className="animate-bounce" />
              </div>
            </div>
          </section>

          {/* ── TRUST STATS BAR ───────────────────────────────── */}
          <section
            aria-label="Platform statistics"
            className="border-b border-line bg-white/70 px-6 py-6 backdrop-blur-sm"
          >
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { value: "10,000+", label: "Celebrities indexed" },
                { value: "100%", label: "Free to use" },
                { value: "Wikidata", label: "Verified source" },
                { value: "Chronological", label: "Timeline view" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-display text-2xl italic font-semibold text-ink sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 font-body text-xs text-ink-soft">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── HOW IT WORKS ──────────────────────────────────── */}
          <section
            id="how-it-works"
            aria-labelledby="hiw-heading"
            className="mx-auto max-w-5xl px-6 py-20 sm:py-28"
          >
            <div className="text-center">
              <p className="font-body text-sm font-medium uppercase tracking-widest text-wine">
                How it works
              </p>
              <h2
                id="hiw-heading"
                className="mt-3 text-balance font-display text-3xl italic text-ink sm:text-4xl"
              >
                Three steps to a full relationship history
              </h2>
              <p className="mx-auto mt-4 max-w-lg font-body text-sm leading-relaxed text-ink-soft">
                No sign-up. No paywall. Just search, explore, and share.
              </p>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: <Search size={22} className="text-wine" />,
                  step: "01",
                  title: "Search a name",
                  body: "Type any celebrity's name into the search bar. Our engine looks up their public record from Wikidata in seconds.",
                },
                {
                  icon: <Clock size={22} className="text-wine" />,
                  step: "02",
                  title: "See the timeline",
                  body: "Every documented relationship is placed in chronological order on a clean, visual timeline — dating, engaged, married, divorced.",
                },
                {
                  icon: <Heart size={22} className="text-wine" />,
                  step: "03",
                  title: "Explore connections",
                  body: "Discover overlap, duration, and shared connections. Switch to Constellation View to map their entire romantic network.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-line bg-white/60 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
                >
                  <span className="font-display text-5xl italic font-bold text-ink/5 absolute top-4 right-5 select-none">
                    {item.step}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine/[0.08] ring-1 ring-wine/15">
                    {item.icon}
                  </div>
                  <h3 className="mt-4 font-display text-lg italic text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-ink-soft">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── TRENDING CELEBRITIES ──────────────────────────── */}
          <section
            id="trending"
            aria-labelledby="trending-heading"
            className="border-t border-line/60 bg-gradient-to-b from-white/80 to-paper px-6 py-20 sm:py-28"
          >
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm font-medium uppercase tracking-widest text-wine">
                    Trending now
                  </p>
                  <h2
                    id="trending-heading"
                    className="mt-2 font-display text-3xl italic text-ink sm:text-4xl"
                  >
                    Popular relationship timelines
                  </h2>
                </div>
                <TrendingUp size={28} className="text-gold hidden sm:block" />
              </div>

              <p className="mt-3 max-w-lg font-body text-sm leading-relaxed text-ink-soft">
                These celebrities are being searched most frequently right now.
                Click any name to explore their full dating and marriage history.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TRENDING_NAMES.map((name) => (
                  <Link
                    key={name}
                    href={`/celebrity/${slugify(name)}`}
                    className="group flex items-center gap-4 rounded-2xl border border-line/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"
                    aria-label={`View ${name}'s relationship timeline`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ink/5 to-ink/10 font-display text-base italic font-semibold text-ink-soft ring-1 ring-line/60 transition-colors group-hover:from-wine/10 group-hover:to-wine/15 group-hover:text-wine group-hover:ring-wine/30">
                      {name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-body text-sm font-medium text-ink group-hover:text-wine transition-colors truncate">
                        {name}
                      </p>
                      <p className="font-body text-xs text-ink-soft/70 truncate">
                        View relationship timeline
                      </p>
                    </div>
                    <ArrowRight
                      size={15}
                      className="ml-auto shrink-0 text-ink/20 transition-all group-hover:translate-x-0.5 group-hover:text-wine/60"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── WHY LINKED (FEATURES) ─────────────────────────── */}
          <section
            id="features"
            aria-labelledby="features-heading"
            className="border-t border-line/60 bg-ink px-6 py-20 sm:py-28"
          >
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <p className="font-body text-sm font-medium uppercase tracking-widest text-gold">
                  Why Linked
                </p>
                <h2
                  id="features-heading"
                  className="mt-3 text-balance font-display text-3xl italic text-paper sm:text-4xl"
                >
                  The most honest celebrity relationship archive on the web
                </h2>
                <p className="mx-auto mt-4 max-w-lg font-body text-sm leading-relaxed text-paper/55">
                  No clickbait, no speculation. Just structured, sourced data displayed beautifully.
                </p>
              </div>

              <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    icon: <Clock size={20} className="text-gold" />,
                    title: "Chronological order",
                    body: "Every relationship is plotted on a single timeline, in the exact order it actually happened — no ambiguity.",
                  },
                  {
                    icon: <ShieldCheck size={20} className="text-gold" />,
                    title: "Verified & sourced",
                    body: "Built on Wikidata's public, editable knowledge graph — the same structured facts that power Wikipedia.",
                  },
                  {
                    icon: <Database size={20} className="text-gold" />,
                    title: "Honest about gaps",
                    body: "When a date isn't publicly known, we say so instead of guessing. Accuracy over completeness.",
                  },
                  {
                    icon: <Search size={20} className="text-gold" />,
                    title: "Search any celebrity",
                    body: "From A-list Hollywood actors to pop stars and athletes — if they're in Wikidata, they're on Linked.",
                  },
                  {
                    icon: <Heart size={20} className="text-gold" />,
                    title: "All relationship types",
                    body: "Includes dating, engaged, married, and divorced statuses, with start and end years when available.",
                  },
                  {
                    icon: <Star size={20} className="text-gold" />,
                    title: "Constellation view",
                    body: "See the full romantic network of a celebrity visualized as a beautiful interactive constellation map.",
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-paper/10 bg-paper/5 p-5 backdrop-blur-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/20">
                      {f.icon}
                    </div>
                    <h3 className="mt-4 font-display text-base italic text-paper">
                      {f.title}
                    </h3>
                    <p className="mt-2 font-body text-sm leading-relaxed text-paper/55">
                      {f.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── ABOUT / EDITORIAL ─────────────────────────────── */}
          <section
            id="about"
            aria-labelledby="about-heading"
            className="border-t border-line/60 px-6 py-20 sm:py-28"
          >
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
                <div>
                  <p className="font-body text-sm font-medium uppercase tracking-widest text-wine">
                    About Linked
                  </p>
                  <h2
                    id="about-heading"
                    className="mt-3 text-balance font-display text-3xl italic text-ink sm:text-4xl"
                  >
                    A public record for public relationships
                  </h2>
                  <p className="mt-5 font-body text-sm leading-relaxed text-ink-soft">
                    Linked was built to answer a simple question: who did this
                    person date, and in what order? Celebrity relationships are
                    widely covered, but rarely presented in a clean,
                    chronological, factual way.
                  </p>
                  <p className="mt-4 font-body text-sm leading-relaxed text-ink-soft">
                    We built Linked on top of{" "}
                    <a
                      href="https://www.wikidata.org"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-wine underline underline-offset-2 hover:text-wine-deep"
                    >
                      Wikidata
                    </a>
                    , the free, collaborative, multilingual knowledge base
                    maintained by the Wikimedia Foundation. Every fact on Linked
                    has a traceable source — no guessing, no rumour-mongering.
                  </p>
                  <p className="mt-4 font-body text-sm leading-relaxed text-ink-soft">
                    Private relationships that were never publicly disclosed are
                    not shown. Corrections to any data can be submitted directly
                    to Wikidata, ensuring the record stays accurate over time.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: <ShieldCheck size={18} className="text-wine" />,
                      title: "Transparent sourcing",
                      body: "Every piece of data links back to Wikidata, which itself cites Wikipedia and mainstream press.",
                    },
                    {
                      icon: <Database size={18} className="text-wine" />,
                      title: "Publicly editable",
                      body: "Wikidata is community-maintained. If data is wrong, anyone can flag a correction at wikidata.org.",
                    },
                    {
                      icon: <Clock size={18} className="text-wine" />,
                      title: "Regularly updated",
                      body: "As Wikidata is updated with new relationships and public records, Linked reflects those changes.",
                    },
                    {
                      icon: <Star size={18} className="text-wine" />,
                      title: "No paparazzi data",
                      body: "We only show what's in Wikidata — no speculation from tabloids or unverified gossip.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-line bg-white/60 p-4 backdrop-blur-sm"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine/[0.08] ring-1 ring-wine/15">
                        {item.icon}
                      </div>
                      <h3 className="mt-3 font-body text-sm font-semibold text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 font-body text-xs leading-relaxed text-ink-soft">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── FAQ ───────────────────────────────────────────── */}
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="border-t border-line/60 bg-white/50 px-6 py-20 sm:py-28"
          >
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                <p className="font-body text-sm font-medium uppercase tracking-widest text-wine">
                  FAQ
                </p>
                <h2
                  id="faq-heading"
                  className="mt-3 text-balance font-display text-3xl italic text-ink sm:text-4xl"
                >
                  Frequently asked questions
                </h2>
                <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-ink-soft">
                  Everything you need to know about Linked and how celebrity
                  relationship data is sourced.
                </p>
              </div>

              <div className="mt-12 divide-y divide-line">
                {[
                  {
                    q: "How does Linked get celebrity relationship data?",
                    a: "Linked pulls data from Wikidata, the free, publicly editable structured knowledge base that powers Wikipedia. Every relationship listed is sourced from verified public records and community-maintained entries.",
                  },
                  {
                    q: "Is the relationship data on Linked accurate?",
                    a: "Yes. All data comes from Wikidata's public knowledge graph and is cross-referenced against mainstream press reports. We clearly label any gaps where dates are not publicly known rather than guessing.",
                  },
                  {
                    q: "Can I search for any celebrity?",
                    a: "You can search for any well-known public figure present in Wikidata. This includes actors, musicians, athletes, politicians, and other public personalities who have documented relationship histories.",
                  },
                  {
                    q: "How is Linked different from celebrity gossip sites?",
                    a: "Linked is a factual, timeline-based archive — not a gossip site. We display verified, sourced information in chronological order without speculation. Every record links back to its original Wikidata entry.",
                  },
                  {
                    q: "Is Linked free to use?",
                    a: "Yes, Linked is completely free to use. You can search any celebrity and view their full relationship timeline at no cost, with no account or registration required.",
                  },
                  {
                    q: "What does 'Constellation View' mean?",
                    a: "Constellation View is an interactive graph visualization that maps out the entire romantic network of a celebrity — showing how their relationships connect to one another over time, displayed as stars in a night sky.",
                  },
                  {
                    q: "What if a celebrity's data is missing or incorrect?",
                    a: "Since our data comes from Wikidata, corrections can be submitted directly at wikidata.org by anyone. The Wikidata community reviews and validates all edits, which then flow through to Linked automatically.",
                  },
                  {
                    q: "Does Linked cover non-English celebrities?",
                    a: "Yes. Wikidata is a multilingual knowledge base covering public figures from around the world. If a celebrity has a Wikidata entry with relationship data, Linked can display their timeline regardless of nationality.",
                  },
                ].map((item) => (
                  <details
                    key={item.q}
                    className="group py-5 cursor-pointer"
                    itemScope
                    itemType="https://schema.org/Question"
                  >
                    <summary
                      itemProp="name"
                      className="flex items-center justify-between gap-4 font-body text-sm font-semibold text-ink list-none select-none hover:text-wine transition-colors"
                    >
                      {item.q}
                      <ChevronDown
                        size={16}
                        className="shrink-0 text-ink-soft/50 transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <div
                      itemScope
                      itemType="https://schema.org/Answer"
                      itemProp="acceptedAnswer"
                    >
                      <p
                        itemProp="text"
                        className="mt-3 font-body text-sm leading-relaxed text-ink-soft"
                      >
                        {item.a}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ── SECOND SEARCH CTA ─────────────────────────────── */}
          <section
            aria-label="Search call to action"
            className="relative overflow-hidden border-t border-line/60 bg-ink px-6 py-20 sm:py-28"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, #F6F2EA 1px, transparent 0)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-balance font-display text-3xl italic text-paper sm:text-4xl">
                Ready to trace a celebrity relationship?
              </h2>
              <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-paper/55">
                Search any famous name and get a full, sourced relationship
                timeline in seconds — completely free.
              </p>
              <div className="mt-8 mx-auto max-w-lg">
                <SearchForm tone="dark" />
              </div>
            </div>
          </section>
        </main>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer className="border-t border-line/60 bg-white/70 px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 sm:grid-cols-3">
              {/* Brand */}
              <div>
                <p className="font-display text-lg italic font-semibold text-ink">
                  Linked
                </p>
                <p className="mt-2 font-body text-xs leading-relaxed text-ink-soft max-w-xs">
                  Celebrity relationship timelines, sourced from Wikidata's
                  public knowledge graph. Accurate, chronological, and free.
                </p>
              </div>

              {/* Trending links for SEO */}
              <div>
                <p className="font-body text-xs font-semibold uppercase tracking-widest text-ink/50">
                  Popular searches
                </p>
                <ul className="mt-3 space-y-2" role="list">
                  {TRENDING_NAMES.slice(0, 6).map((name) => (
                    <li key={name}>
                      <Link
                        href={`/celebrity/${slugify(name)}`}
                        className="font-body text-xs text-ink-soft hover:text-wine transition-colors"
                      >
                        {name} relationship history
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* More links */}
              <div>
                <p className="font-body text-xs font-semibold uppercase tracking-widest text-ink/50">
                  More celebrities
                </p>
                <ul className="mt-3 space-y-2" role="list">
                  {TRENDING_NAMES.slice(6).map((name) => (
                    <li key={name}>
                      <Link
                        href={`/celebrity/${slugify(name)}`}
                        className="font-body text-xs text-ink-soft hover:text-wine transition-colors"
                      >
                        {name} dating history
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line/60 pt-6 sm:flex-row">
              <p className="font-body text-xs text-ink-soft/60">
                © {new Date().getFullYear()} Linked. Data sourced from{" "}
                <a
                  href="https://www.wikidata.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-2 hover:text-ink-soft transition-colors"
                >
                  Wikidata
                </a>{" "}
                under CC0.
              </p>
              <nav
                aria-label="Footer navigation"
                className="flex items-center gap-4"
              >
                <Link
                  href="#how-it-works"
                  className="font-body text-xs text-ink-soft/60 hover:text-ink-soft transition-colors"
                >
                  How it works
                </Link>
                <Link
                  href="#faq"
                  className="font-body text-xs text-ink-soft/60 hover:text-ink-soft transition-colors"
                >
                  FAQ
                </Link>
                <Link
                  href="#about"
                  className="font-body text-xs text-ink-soft/60 hover:text-ink-soft transition-colors"
                >
                  About
                </Link>
                <a
                  href="https://www.wikidata.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-body text-xs text-ink-soft/60 hover:text-ink-soft transition-colors"
                >
                  Data source
                </a>
              </nav>
            </div>

            <p className="mt-4 font-body text-[11px] leading-relaxed text-ink-soft/40 text-center">
              Linked displays publicly available relationship data for
              informational purposes only. All data is sourced from Wikidata&apos;s
              open knowledge graph. Private relationships not publicly disclosed
              are not shown. For corrections, visit wikidata.org.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

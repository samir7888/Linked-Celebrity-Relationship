import { redirect } from "next/navigation";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { slugify } from "@/lib/utils";
import { TRENDING_NAMES } from "@/lib/trending";

const EXAMPLES = TRENDING_NAMES.slice(0, 5);

export default function HomePage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  // No-JS fallback: plain HTML form submits GET /?q=name
  // — redirect server-side so it still works without JavaScript.
  const q = searchParams?.q?.trim();
  if (q) {
    redirect(`/celebrity/${slugify(q)}`);
  }

  return (
    <main>
      <section className="relative overflow-hidden bg-ink px-6 py-24 sm:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #F6F2EA 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="font-body text-sm tracking-wide text-gold">A public record, laid out plainly</p>
          <h1 className="mt-5 text-balance font-display text-5xl italic leading-[1.05] text-paper sm:text-6xl">
            Every relationship,<br />in order.
          </h1>
          <p className="mt-6 max-w-md text-balance font-body text-base leading-relaxed text-paper/65">
            Search a name. See who they dated, who they married, when it started
            and how long it lasted
          </p>
          <div className="mt-9 w-full max-w-lg">
            <SearchForm tone="dark" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm">
            <span className="text-paper/40">Try:</span>
            {EXAMPLES.map((name) => (
              <Link
                key={name}
                href={`/celebrity/${slugify(name)}`}
                className="mark-underline text-paper/70 transition-colors hover:text-paper"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-3">
          <Feature
            title="Chronological"
            body="Every relationship placed on a single timeline, in the order it actually happened."
          />
          <Feature
            title="Sourced"
            body="Built on Wikidata's public, editable records — the same structured facts behind Wikipedia."
          />
          <Feature
            title="Honest gaps"
            body="When a date isn't publicly known, we say so instead of guessing."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-line pt-4">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

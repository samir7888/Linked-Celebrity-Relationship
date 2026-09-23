import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="font-body text-sm text-gold">No match</p>
      <h1 className="mt-3 font-display text-3xl italic text-ink">
        We couldn&rsquo;t place that name.
      </h1>
      <p className="mt-3 font-body text-sm leading-relaxed text-ink-soft">
        Either the spelling is off, or there&rsquo;s no public record of them yet.
        Try a full name, or search someone else.
      </p>
      <div className="mt-7 w-full">
        <SearchForm tone="light" />
      </div>
      <Link href="/" className="mt-6 font-body text-sm text-ink-soft underline underline-offset-4">
        Back home
      </Link>
    </main>
  );
}

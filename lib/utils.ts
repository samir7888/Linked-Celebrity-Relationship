import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turn a free-text name into a URL-safe slug used for /celebrity/[slug] routes. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Turn a slug back into a human-readable search query (best effort). */
export function unslugify(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatYear(iso?: string | null): string | null {
  if (!iso) return null;
  const match = iso.match(/^(-?\d{1,4})/);
  if (!match) return null;
  return match[1];
}

export function formatDuration(startIso?: string | null, endIso?: string | null): string {
  const startYear = formatYear(startIso);
  if (!startYear) return "Date unknown";
  const start = parseInt(startYear, 10);
  const endYear = formatYear(endIso);
  if (!endYear) return `${start} — present`;
  const end = parseInt(endYear, 10);
  const years = end - start;
  if (years <= 0) return `${start}`;
  return `${start} — ${end} · ${years} ${years === 1 ? "year" : "years"}`;
}

export function durationInYears(startIso?: string | null, endIso?: string | null): number {
  const startYear = formatYear(startIso);
  if (!startYear) return 0;
  const start = parseInt(startYear, 10);
  const endYear = formatYear(endIso) ?? String(new Date().getFullYear());
  const end = parseInt(endYear, 10);
  return Math.max(end - start, 0.5);
}

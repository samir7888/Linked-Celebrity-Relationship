"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SearchForm({
  initialValue = "",
  tone = "dark",
}: {
  initialValue?: string;
  tone?: "dark" | "light";
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();

    // Validation
    if (!trimmed) {
      setError("Please enter a celebrity name.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Name is too long.");
      return;
    }
    if (!/^[\p{L}\s'\-\.]+$/u.test(trimmed)) {
      setError("Please enter a valid name (letters only).");
      return;
    }

    setError(null);
    setIsLoading(true);
    router.push(`/celebrity/${slugify(trimmed)}`);
    // isLoading stays true until Next.js unmounts this component on navigation
  }

  const isDark = tone === "dark";

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search for a celebrity"
        className={cn(
          "flex w-full items-center gap-3 rounded-full border px-5 py-3 transition-colors",
          isDark
            ? "border-paper/25 bg-paper/[0.06] focus-within:border-paper/60"
            : "border-line bg-white/70 focus-within:border-wine/60",
          error && !isDark && "border-red-400 focus-within:border-red-500",
          error && isDark && "border-red-400/60 focus-within:border-red-400"
        )}
      >
        <Search
          aria-hidden
          size={18}
          className={isDark ? "shrink-0 text-paper/50" : "shrink-0 text-ink-soft/60"}
        />
        <input
          type="text"
          name="q"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Search any well-known name…"
          aria-label="Celebrity name"
          aria-invalid={!!error}
          aria-describedby={error ? "search-error" : undefined}
          disabled={isLoading}
          className={cn(
            "w-full bg-transparent font-body text-base outline-none placeholder:font-body disabled:opacity-60",
            isDark ? "text-paper placeholder:text-paper/40" : "text-ink placeholder:text-ink-soft/50"
          )}
        />
        <button
          type="submit"
          id="trace-btn"
          disabled={isLoading}
          aria-label={isLoading ? "Searching…" : "Trace celebrity"}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            "disabled:cursor-not-allowed disabled:opacity-70",
            isDark
              ? "bg-paper text-ink hover:bg-paper/90 active:scale-95"
              : "bg-wine text-paper hover:bg-wine-deep active:scale-95"
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" />
              Searching…
            </span>
          ) : (
            "Trace"
          )}
        </button>
      </form>

      {error && (
        <p
          id="search-error"
          role="alert"
          className={cn(
            "mt-2 px-2 text-xs font-body",
            isDark ? "text-red-300" : "text-red-500"
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
}

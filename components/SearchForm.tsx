"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useTransition, type FormEvent } from "react";
import { Search, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TRENDING_NAMES } from "@/lib/trending";

export function SearchForm({
  initialValue = "",
  tone = "dark",
}: {
  initialValue?: string;
  tone?: "dark" | "light";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim();

  // Filter matching suggestions
  const suggestions = trimmed.length >= 1
    ? TRENDING_NAMES.filter((name) =>
        name.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pre-fetch suggestion routes when typing
  useEffect(() => {
    if (suggestions.length > 0) {
      for (const s of suggestions.slice(0, 2)) {
        router.prefetch(`/celebrity/${slugify(s)}`);
      }
    }
  }, [suggestions, router]);

  function navigateToCelebrity(rawName: string) {
    const clean = rawName.trim();
    if (!clean) {
      setError("Please enter a celebrity name.");
      return;
    }
    if (clean.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (clean.length > 100) {
      setError("Name is too long.");
      return;
    }
    if (!/^[\p{L}\s'\-\.]+$/u.test(clean)) {
      setError("Please enter a valid name (letters only).");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setIsOpen(false);

    startTransition(() => {
      router.push(`/celebrity/${slugify(clean)}`);
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      navigateToCelebrity(suggestions[selectedIndex]);
    } else {
      navigateToCelebrity(value);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const isDark = tone === "dark";
  const isLoading = isSubmitting || isPending;

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search for a celebrity"
        className={cn(
          "flex w-full items-center gap-3 rounded-full border px-4 py-2.5 sm:px-5 sm:py-3 transition-colors",
          isDark
            ? "border-paper/25 bg-paper/[0.06] focus-within:border-paper/60 focus-within:bg-paper/[0.09]"
            : "border-line bg-white/80 focus-within:border-wine/60 focus-within:bg-white shadow-xs",
          error && !isDark && "border-red-400 focus-within:border-red-500",
          error && isDark && "border-red-400/60 focus-within:border-red-400"
        )}
      >
        <Search
          aria-hidden
          size={18}
          className={
            isDark ? "shrink-0 text-paper/50" : "shrink-0 text-ink-soft/60"
          }
        />
        <input
          ref={inputRef}
          type="text"
          name="q"
          value={value}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onChange={(e) => {
            setValue(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search any well-known name…"
          aria-label="Celebrity name"
          aria-invalid={!!error}
          aria-describedby={error ? "search-error" : undefined}
          disabled={isLoading}
          autoComplete="off"
          className={cn(
            "w-full bg-transparent font-body text-sm sm:text-base outline-none placeholder:font-body disabled:opacity-60",
            isDark
              ? "text-paper placeholder:text-paper/40"
              : "text-ink placeholder:text-ink-soft/50"
          )}
        />
        <button
          type="submit"
          id="trace-btn"
          disabled={isLoading}
          aria-label={isLoading ? "Searching…" : "Trace celebrity"}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium transition-all",
            "disabled:cursor-not-allowed disabled:opacity-70",
            isDark
              ? "bg-paper text-ink hover:bg-paper/90 active:scale-95"
              : "bg-wine text-paper hover:bg-wine-deep active:scale-95"
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin" />
              <span>Tracing…</span>
            </span>
          ) : (
            "Trace"
          )}
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border p-1.5 shadow-xl backdrop-blur-md transition-all duration-200",
            isDark
              ? "border-paper/20 bg-ink-deep/95 text-paper"
              : "border-line bg-white/95 text-ink"
          )}
        >
          <div className="px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-ink-soft/50">
            Suggested Celebrities
          </div>
          <ul role="listbox" className="space-y-0.5">
            {suggestions.map((name, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <li key={name} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setValue(name);
                      navigateToCelebrity(name);
                    }}
                    onClick={() => {
                      setValue(name);
                      navigateToCelebrity(name);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-body text-xs sm:text-sm transition-colors",
                      isSelected
                        ? isDark
                          ? "bg-paper/15 text-paper font-medium"
                          : "bg-wine/10 text-wine font-medium"
                        : isDark
                        ? "text-paper/80 hover:bg-paper/10 hover:text-paper"
                        : "text-ink hover:bg-ink/5"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles
                        size={12}
                        className={isDark ? "text-gold" : "text-wine"}
                      />
                      <span>{name}</span>
                    </span>
                    <ArrowRight
                      size={12}
                      className={cn(
                        "transition-transform",
                        isSelected
                          ? "translate-x-0.5 opacity-100"
                          : "opacity-40"
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

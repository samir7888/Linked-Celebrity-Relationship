export default function Loading() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="h-5 w-16 animate-pulse rounded-lg bg-ink/8" />
          <div className="hidden h-9 max-w-xs flex-1 animate-pulse rounded-full bg-ink/6 sm:block md:max-w-sm" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-ink/6" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-6 sm:pt-10">
        {/* Profile hero skeleton */}
        <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-white/70 p-4 sm:rounded-3xl sm:p-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="h-20 w-20 animate-pulse shrink-0 rounded-2xl bg-ink/8 sm:h-28 sm:w-28 sm:rounded-3xl" />
            <div className="w-full space-y-3">
              <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-ink/6 sm:mx-0" />
              <div className="mx-auto h-8 w-56 animate-pulse rounded-lg bg-ink/8 sm:mx-0 sm:h-12 sm:w-72" />
              <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-ink/6 sm:mx-0" />
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-line/80 bg-white/70 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="h-2.5 w-20 animate-pulse rounded-full bg-ink/6" />
                <div className="h-7 w-7 animate-pulse rounded-full bg-ink/6" />
              </div>
              <div className="mt-3 h-7 w-12 animate-pulse rounded-lg bg-ink/8 sm:h-8" />
              <div className="mt-1.5 h-2.5 w-20 animate-pulse rounded-full bg-ink/5" />
            </div>
          ))}
        </div>

        {/* Section heading skeleton */}
        <div className="mt-12 border-b border-line/80 pb-4 sm:mt-14">
          <div className="flex items-end justify-between">
            <div>
              <div className="h-7 w-48 animate-pulse rounded-lg bg-ink/8 sm:h-9" />
              <div className="mt-2 h-3 w-64 animate-pulse rounded-full bg-ink/5" />
            </div>
            <div className="h-8 w-36 animate-pulse rounded-2xl bg-ink/6" />
          </div>
        </div>

        {/* Timeline filter bar skeleton */}
        <div className="mt-4 h-11 animate-pulse rounded-2xl bg-ink/5" />

        {/* Timeline cards skeleton */}
        <div className="mt-5 space-y-4 pl-6 sm:pl-24">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 80}ms` }}
              className="flex items-start gap-3 animate-pulse rounded-2xl border border-line bg-white/70 p-3.5 sm:gap-4 sm:p-4.5"
            >
              <div className="h-12 w-12 shrink-0 rounded-xl bg-ink/8 sm:h-16 sm:w-16 sm:rounded-2xl" />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-4 w-32 rounded-lg bg-ink/8" />
                <div className="flex gap-1.5">
                  <div className="h-4 w-14 rounded-full bg-ink/6" />
                  <div className="h-4 w-14 rounded-full bg-ink/6" />
                </div>
                <div className="h-3 w-28 rounded-full bg-ink/5" />
                <div className="h-1.5 w-36 rounded-full bg-ink/6" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex items-center justify-center gap-2 pb-12 text-ink-soft/50">
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:0ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
          <span className="ml-1.5 font-body text-xs">Loading relationship data…</span>
        </div>
      </div>
    </div>
  );
}

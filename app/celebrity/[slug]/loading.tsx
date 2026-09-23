export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl animate-pulse px-6 py-14">
      <div className="h-4 w-24 rounded bg-ink/10" />
      <div className="mt-6 flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-ink/10" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-ink/10" />
          <div className="h-4 w-32 rounded bg-ink/10" />
        </div>
      </div>
      <div className="mt-10 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-ink/5" />
        ))}
      </div>
    </main>
  );
}

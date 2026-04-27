export default function DashboardSegmentLoading() {
  return (
    <section className="min-h-[60vh] space-y-4 rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
    </section>
  );
}

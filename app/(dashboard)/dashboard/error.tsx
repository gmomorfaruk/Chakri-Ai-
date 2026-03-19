"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
      <h1 className="text-lg font-semibold">Dashboard module failed to load</h1>
      <p className="mt-2 text-sm text-red-200/90">Please retry. If this keeps happening, refresh or sign in again.</p>
      <button onClick={reset} className="mt-4 rounded-lg border border-red-300/50 px-3 py-2 text-sm">
        Retry
      </button>
    </section>
  );
}

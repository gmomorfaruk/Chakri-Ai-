"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            An unexpected error occurred. You can retry, and if the issue persists, refresh the page.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{error.digest ? `Ref: ${error.digest}` : null}</p>
          <button onClick={reset} className="mt-5 rounded-lg bg-primary px-4 py-2 text-primary-foreground">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

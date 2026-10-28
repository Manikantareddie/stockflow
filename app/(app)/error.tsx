"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
      <p className="text-sm font-medium text-destructive">Something went wrong.</p>
      <p className="text-sm text-secondary">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-background"
      >
        Try again
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Root Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-secondary">
          The application encountered a critical error. This is often caused by a stale browser cache or a temporary server issue.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Force reload page
          </button>
        </div>
        <p className="mt-8 text-xs text-muted">
          Error: {error.message || "Unknown error"}
        </p>
      </div>
    </div>
  );
}

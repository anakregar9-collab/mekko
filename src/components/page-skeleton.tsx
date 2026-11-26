/** Lightweight loading state shown while request-time (session) content streams in. */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-4" aria-busy="true">
      {title ? (
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      ) : (
        <div className="h-9 w-48 animate-pulse rounded-xl bg-line" />
      )}
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface" />
      <span className="sr-only">Nalagam …</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-6 text-center ring-1 ring-line sm:p-8">
      <p className="font-display text-xl font-bold">{title}</p>
      {children && <div className="mt-2 text-ink-muted">{children}</div>}
    </div>
  );
}

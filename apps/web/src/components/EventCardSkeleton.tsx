export function EventCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-5 animate-pulse">
      {/* Top row: title + badge placeholder */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title */}
          <div className="h-5 w-3/4 rounded bg-[var(--color-outline-variant)]" />
          {/* Date */}
          <div className="h-4 w-1/2 rounded bg-[var(--color-outline-variant)]" />
          {/* Description lines */}
          <div className="h-3 w-full rounded bg-[var(--color-outline-variant)] mt-2" />
          <div className="h-3 w-5/6 rounded bg-[var(--color-outline-variant)]" />
        </div>
        {/* Badge placeholder */}
        <div className="h-6 w-16 rounded-full bg-[var(--color-outline-variant)] flex-shrink-0" />
      </div>

      {/* Bottom row: code + languages */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--color-outline-variant)]">
        <div className="h-4 w-12 rounded bg-[var(--color-outline-variant)]" />
        <div className="h-4 w-20 rounded bg-[var(--color-outline-variant)]" />
      </div>
    </div>
  )
}

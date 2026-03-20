interface StatusBadgeProps {
  status: 'upcoming' | 'live' | 'ended'
}

const styles = {
  upcoming: 'bg-surface-container-high text-secondary border border-outline-variant/30',
  live: 'bg-error/20 text-error animate-pulse',
  ended: 'bg-surface-container-high text-outline border border-outline-variant/30',
} as const

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}>
      {status === 'live' && (
        <span className="w-1.5 h-1.5 bg-white rounded-full" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

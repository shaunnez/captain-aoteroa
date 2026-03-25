interface StatusBadgeProps {
  status: 'upcoming' | 'live' | 'ended'
}

const styles = {
  upcoming: 'bg-[var(--color-primary)] text-white',
  live: 'bg-green-500 text-white animate-pulse',
  ended: 'bg-[var(--color-outline)] text-white',
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

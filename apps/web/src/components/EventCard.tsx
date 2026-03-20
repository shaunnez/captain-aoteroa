import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import type { Event } from '@caption-aotearoa/shared'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate()

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-NZ', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <button
      onClick={() => navigate(`/event/${event.code}`)}
      className="w-full text-left bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-lg font-bold text-on-surface group-hover:text-primary transition-colors truncate">
            {event.title}
          </h3>
          {formattedDate && (
            <p className="text-sm text-on-surface-variant mt-1">{formattedDate}</p>
          )}
          {event.description && (
            <p className="text-sm text-secondary mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <StatusBadge status={event.status} />
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant/20">
        <span className="text-xs font-mono text-secondary tracking-wider">
          {event.code}
        </span>
        <span className="text-xs text-outline">
          {event.languages.length} languages
        </span>
      </div>
    </button>
  )
}

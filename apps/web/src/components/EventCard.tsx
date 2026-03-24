import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import type { Event } from '@caption-aotearoa/shared'

interface EventCardProps {
  event: Event
  to?: string   // defaults to /event/:code if omitted — backward compatible
}

export function EventCard({ event, to }: EventCardProps) {
  const navigate = useNavigate()

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-NZ', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null

  return (
    <button
      onClick={() => navigate(to ?? `/event/${event.code}`)}
      className="w-full h-full text-left rounded-xl p-5
                 flex flex-col
                 bg-[var(--color-surface-container)]
                 border border-[var(--color-outline-variant)]
                 hover:border-[var(--color-primary)] hover:shadow-lg
                 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3 flex-1">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] truncate
                         group-hover:text-[var(--color-primary)] transition-colors" style={{ color: event.theme_color || 'var(--color-primary)' }}>
            {event.title}
          </h3>
          {event.organiser_name && (
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              by {event.organiser_name}
            </p>
          )}
          {formattedDate && (
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{formattedDate}</p>
          )}
          {event.description && (
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <StatusBadge status={event.status} />
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--color-outline-variant)]">
        <span className="text-xs font-mono text-[var(--color-primary)] opacity-70 tracking-wider">
          {event.code}
        </span>
        {/* <span className="text-xs text-[var(--color-on-surface-variant)]">
          {event.languages.length} languages
        </span> */}
      </div>
    </button>
  )
}

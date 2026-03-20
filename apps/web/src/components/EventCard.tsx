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
      className="w-full text-left bg-white rounded-xl p-5 border-2 border-brand-purple border-opacity-10 hover:border-opacity-30 transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-brand-purple-dark truncate">
            {event.title}
          </h3>
          {formattedDate && (
            <p className="text-sm text-brand-black opacity-60 mt-1">{formattedDate}</p>
          )}
          {event.description && (
            <p className="text-sm text-brand-black opacity-70 mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <StatusBadge status={event.status} />
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-purple border-opacity-10">
        <span className="text-xs font-mono text-brand-purple opacity-60 tracking-wider">
          {event.code}
        </span>
        <span className="text-xs text-brand-black opacity-50">
          {event.languages.length} languages
        </span>
      </div>
    </button>
  )
}

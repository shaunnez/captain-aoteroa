import type { Event } from '@caption-aotearoa/shared'
import { useCountdown } from '../hooks/useCountdown'

interface EventLobbyProps {
  event: Event
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function EventLobby({ event }: EventLobbyProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(event.event_date)

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sand p-6">
      <div className="bg-white border-2 border-brand-purple border-opacity-20 rounded-2xl p-8 max-w-lg w-full text-center shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-brand-purple-dark mb-2" style={{ color: event.theme_color || 'var(--color-primary)' }}>
          {event.title}
        </h1>

        {event.description && (
          <p className="text-brand-black opacity-70 mb-4">{event.description}</p>
        )}

        {event.event_date && (
          <p className="text-sm text-brand-purple opacity-60 mb-6">
            {new Date(event.event_date).toLocaleString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}

        {!isExpired ? (
          <>
            <p className="text-sm font-medium text-brand-purple uppercase tracking-wide mb-3">
              Starting in
            </p>
            <div className="flex justify-center gap-4 font-mono text-3xl font-bold text-brand-purple-dark">
              {days > 0 && (
                <div className="flex flex-col items-center">
                  <span>{pad(days)}</span>
                  <span className="text-xs font-sans font-normal opacity-60 mt-1">days</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <span>{pad(hours)}</span>
                <span className="text-xs font-sans font-normal opacity-60 mt-1">hrs</span>
              </div>
              <div className="flex flex-col items-center">
                <span>{pad(minutes)}</span>
                <span className="text-xs font-sans font-normal opacity-60 mt-1">min</span>
              </div>
              <div className="flex flex-col items-center">
                <span>{pad(seconds)}</span>
                <span className="text-xs font-sans font-normal opacity-60 mt-1">sec</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-brand-purple text-lg">
            Waiting for captions to begin…
          </p>
        )}
      </div>
    </div>
  )
}

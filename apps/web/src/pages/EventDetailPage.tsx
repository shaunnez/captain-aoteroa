import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { StatusBadge } from '../components/StatusBadge'
import { QRDisplay } from '../components/QRDisplay'
import { TranscriptDownload } from '../components/TranscriptDownload'
import type { Event } from '@caption-aotearoa/shared'
import { ArrowLeft, Play, Square, RotateCcw } from 'lucide-react'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: events = [] } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
  })

  const event = events.find((e) => e.id === id)

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/events/${event?.code}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-events'] }),
  })

  const retryTranscript = useMutation({
    mutationFn: () => api.post(`/api/events/${event?.code}/transcript/retry`),
  })

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-secondary">Loading event…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="bg-surface-container-lowest text-on-surface px-6 py-4 flex items-center gap-4 border-b border-outline-variant/20">
        <button onClick={() => navigate('/dashboard')} className="text-secondary hover:text-on-surface">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline text-xl font-semibold text-on-surface truncate">{event.title}</h1>
          <span className="text-sm text-secondary font-mono">{event.code}</span>
        </div>
        <StatusBadge status={event.status} />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Event info */}
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20">
          <h2 className="font-headline text-lg font-semibold text-on-surface mb-4">Event Details</h2>
          {event.description && <p className="text-on-surface-variant mb-3">{event.description}</p>}
          {event.event_date && (
            <p className="text-sm text-secondary">
              {new Date(event.event_date).toLocaleDateString('en-NZ', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </p>
          )}
          <p className="text-sm text-secondary mt-2">{event.languages.length} languages configured</p>
        </section>

        {/* Controls */}
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20">
          <h2 className="font-headline text-lg font-semibold text-on-surface mb-4">Controls</h2>
          <div className="flex flex-wrap gap-3">
            {event.status === 'upcoming' && (
              <button
                onClick={() => statusMutation.mutate('live')}
                disabled={statusMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Play size={16} />
                Start Captioning
              </button>
            )}
            {event.status === 'live' && (
              <>
                <Link
                  to={`/dashboard/events/${event.id}/present`}
                  className="btn-primary flex items-center gap-2"
                >
                  <Play size={16} />
                  Open Presenter
                </Link>
                <button
                  onClick={() => statusMutation.mutate('ended')}
                  disabled={statusMutation.isPending}
                  className="btn-primary flex items-center gap-2 text-error border-error/40 hover:bg-error-container/20"
                >
                  <Square size={16} />
                  End Event
                </button>
              </>
            )}
            {event.status === 'ended' && (
              <button
                onClick={() => retryTranscript.mutate()}
                disabled={retryTranscript.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <RotateCcw size={16} />
                {retryTranscript.isPending ? 'Retrying…' : 'Retry Transcript'}
              </button>
            )}
            <QRDisplay eventCode={event.code} />
          </div>
        </section>

        {/* Transcript */}
        {event.status === 'ended' && (
          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20">
            <h2 className="font-headline text-lg font-semibold text-on-surface mb-4">Transcript</h2>
            <TranscriptDownload
              eventCode={event.code}
              eventTitle={event.title}
              eventDate={event.event_date}
            />
          </section>
        )}
      </main>
    </div>
  )
}

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
        <p className="text-brand-purple opacity-60">Loading event…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-white opacity-70 hover:opacity-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl font-semibold truncate">{event.title}</h1>
          <span className="text-sm opacity-60 font-mono">{event.code}</span>
        </div>
        <StatusBadge status={event.status} />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Event info */}
        <section className="bg-white rounded-xl p-6 border-2 border-brand-purple border-opacity-10">
          <h2 className="font-serif text-lg font-semibold text-brand-purple-dark mb-4">Event Details</h2>
          {event.description && <p className="text-brand-black opacity-80 mb-3">{event.description}</p>}
          {event.event_date && (
            <p className="text-sm text-brand-black opacity-60">
              {new Date(event.event_date).toLocaleDateString('en-NZ', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </p>
          )}
          <p className="text-sm text-brand-black opacity-50 mt-2">{event.languages.length} languages configured</p>
        </section>

        {/* Controls */}
        <section className="bg-white rounded-xl p-6 border-2 border-brand-purple border-opacity-10">
          <h2 className="font-serif text-lg font-semibold text-brand-purple-dark mb-4">Controls</h2>
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
                  className="btn-secondary flex items-center gap-2 text-brand-error border-brand-error hover:bg-brand-error hover:text-white"
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
                className="btn-secondary flex items-center gap-2"
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
          <section className="bg-white rounded-xl p-6 border-2 border-brand-purple border-opacity-10">
            <h2 className="font-serif text-lg font-semibold text-brand-purple-dark mb-4">Transcript</h2>
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

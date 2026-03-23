import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { DashboardShell } from '../components/DashboardShell'
import { StatusBadge } from '../components/StatusBadge'
import { QRDisplay } from '../components/QRDisplay'
import { TranscriptDownload } from '../components/TranscriptDownload'
import type { Event } from '@caption-aotearoa/shared'
import { ArrowLeft, Play, Square, RotateCcw, ExternalLink } from 'lucide-react'
import { QAPanel } from '../components/QAPanel'

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-on-surface-variant)]">Loading event…</p>
      </div>
    )
  }

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-NZ', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null

  return (
    <DashboardShell
      left={
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]
                       hover:text-[var(--color-on-surface)] transition-colors -ml-1"
          >
            <ArrowLeft size={16} />
            All events
          </button>
          <div className="border-t border-[var(--color-outline-variant)]" />
          <div>
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] leading-snug">
              {event.title}
            </h2>
            <p className="font-mono text-xs text-[var(--color-on-surface-variant)] mt-1">
              {event.code}
            </p>
            {formattedDate && (
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-2">
                {formattedDate}
              </p>
            )}
            <div className="mt-3">
              <StatusBadge status={event.status} />
            </div>
          </div>
        </div>
      }
      main={
        <div className="space-y-6">
          {/* Event details */}
          <section className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] mb-3">
              Event Details
            </h2>
            {event.description && (
              <p className="text-[var(--color-on-surface-variant)] mb-3">{event.description}</p>
            )}
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {event.languages.length} language{event.languages.length !== 1 ? 's' : ''} configured
            </p>
          </section>

          {/* Controls */}
          <section className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] mb-4">
              Controls
            </h2>
            <div className="flex flex-wrap gap-3">
              {event.status === 'upcoming' && (
                <button
                  onClick={() => statusMutation.mutate('live')}
                  disabled={statusMutation.isPending}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Play size={16} />
                  Start Captioning
                </button>
              )}
              {event.status === 'live' && (
                <>
                  {/* Fixed: was /dashboard/events/:id/present — now goes directly to /present/:code */}
                  <Link
                    to={`/present/${event.code}`}
                    className="btn-primary flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Open Presenter
                  </Link>
                  <button
                    onClick={() => statusMutation.mutate('ended')}
                    disabled={statusMutation.isPending}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50
                               text-[var(--color-error)] border-[var(--color-error)]
                               hover:bg-[var(--color-error)] hover:text-white"
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
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  {retryTranscript.isPending ? 'Processing…' : 'Use AI to improve transcript'}
                </button>
              )}
            </div>
          </section>

          {/* Transcript */}
          {event.status === 'ended' && (
            <section className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
              <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] mb-4">
                Transcript
              </h2>
              <TranscriptDownload
                eventCode={event.code}
                eventTitle={event.title}
                eventDate={event.event_date}
              />
            </section>
          )}
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Audience joining
          </h3>
          <QRDisplay eventCode={event.code} />
          <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4 space-y-2">
            <p className="text-xs text-[var(--color-on-surface-variant)]">Join link</p>
            <p className="font-mono text-xs text-[var(--color-on-surface)] break-all">
              {window.location.origin}/event/{event.code}
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)] pt-1">
              Code:{' '}
              <span className="font-mono font-semibold text-[var(--color-on-surface)]">
                {event.code}
              </span>
            </p>
          </div>
          {event.status !== 'ended' && <QAPanel code={event.code} />}
        </div>
      }
    />
  )
}

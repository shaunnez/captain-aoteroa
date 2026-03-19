import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { EventLobby } from '../components/EventLobby'
import { LanguagePicker } from '../components/LanguagePicker'
import type { Event } from '@caption-aotearoa/shared'

export function EventPage() {
  const { code } = useParams<{ code: string }>()
  const [selectedLocale, setSelectedLocale] = useState('en')
  const [lobbyDismissed, setLobbyDismissed] = useState(false)

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
    refetchInterval: 10_000,
  })

  const isConfiguredLanguage = event?.languages.includes(selectedLocale) ?? true

  // Keep captions connected regardless of lobby state
  const { segments, isConnected, error: captionError } = useCaptions(
    code ?? '',
    selectedLocale,
    isConfiguredLanguage,
  )

  // Auto-dismiss lobby when event goes live
  useEffect(() => {
    if (event?.status === 'live') {
      setLobbyDismissed(true)
    }
  }, [event?.status])

  // Show lobby when event_date is future AND status !== 'live' AND not dismissed
  const showLobby =
    !lobbyDismissed &&
    event &&
    event.status !== 'live' &&
    event.event_date &&
    new Date(event.event_date).getTime() > Date.now()

  // Auto-dismiss when countdown expires
  useEffect(() => {
    if (!event?.event_date || lobbyDismissed || event.status === 'live') return
    const diff = new Date(event.event_date).getTime() - Date.now()
    if (diff <= 0) {
      setLobbyDismissed(true)
      return
    }
    const timer = setTimeout(() => setLobbyDismissed(true), diff)
    return () => clearTimeout(timer)
  }, [event?.event_date, event?.status, lobbyDismissed])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-brand-purple text-lg">Loading event…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-brand-error text-lg">Event not found. Check your code and try again.</p>
      </div>
    )
  }

  if (showLobby) {
    return <EventLobby event={event} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold">{event.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-yellow-400'
              }`}
            />
            <span className="text-sm opacity-80">
              {isConnected ? (event.status === 'live' ? 'Live' : 'Connected') : 'Connecting…'}
            </span>
          </div>
        </div>
        {/* Language picker */}
        <LanguagePicker
          selectedLocale={selectedLocale}
          onSelect={setSelectedLocale}
        />
      </header>

      {/* Caption area */}
      {captionError && (
        <div className="bg-brand-error text-white px-6 py-3 text-sm">
          {captionError}
        </div>
      )}
      <main className="flex-1 overflow-hidden p-6">
        {segments.length === 0 && event.status !== 'live' && (
          <p className="text-brand-purple opacity-60 text-lg text-center mt-16">
            Waiting for captions to begin…
          </p>
        )}
        <CaptionDisplay
          segments={segments}
          className="h-full bg-white border-2 border-brand-purple border-opacity-20"
        />
      </main>
    </div>
  )
}

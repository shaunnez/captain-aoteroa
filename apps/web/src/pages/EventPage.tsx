import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { EventLobby } from '../components/EventLobby'
import { LanguagePicker } from '../components/LanguagePicker'
import { useAccessibility } from '../hooks/useAccessibility'
import { useViewerCount } from '../hooks/useViewerCount'
import { Users } from 'lucide-react'
import type { Event } from '@caption-aotearoa/shared'

export function EventPage() {
  const { code } = useParams<{ code: string }>()
  const [selectedLocale, setSelectedLocale] = useState('en')
  const [lobbyDismissed, setLobbyDismissed] = useState(false)
  const { fontSize, highContrast, setFontSize, toggleHighContrast } = useAccessibility()
  const [showSettings, setShowSettings] = useState(false)
  const viewerCount = useViewerCount(code ?? '')

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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-secondary text-lg">Loading event…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-8">
        <p className="text-error text-lg">Event not found. Check your code and try again.</p>
      </div>
    )
  }

  if (showLobby) {
    return <EventLobby event={event} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-container-lowest/95 backdrop-blur-sm text-on-surface px-6 py-4 flex items-center justify-between border-b border-outline-variant/20">
        <div>
          <h1 className="font-headline text-xl font-semibold">{event.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-error animate-pulse' : 'bg-tertiary-container'
              }`}
            />
            <span className="text-sm text-secondary">
              {isConnected ? (event.status === 'live' ? 'Live' : 'Connected') : 'Connecting…'}
            </span>
            {viewerCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-secondary">
                <Users size={14} />
                {viewerCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Language picker */}
          <LanguagePicker
            selectedLocale={selectedLocale}
            onSelect={setSelectedLocale}
          />
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="text-secondary hover:text-on-surface transition-colors"
            aria-label="Accessibility settings"
            title="Accessibility settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </header>

      {/* Accessibility settings panel */}
      {showSettings && (
        <div className="px-6 py-4 border-b border-outline-variant/20 bg-surface-container-low">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label htmlFor="font-size" className="text-sm font-medium text-on-surface-variant whitespace-nowrap">
                Text size
              </label>
              <input
                id="font-size"
                type="range"
                min="1.25"
                max="3"
                step="0.25"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-on-surface-variant w-16">{fontSize}rem</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={toggleHighContrast}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-on-surface-variant">High contrast</span>
            </label>
          </div>
        </div>
      )}

      {/* Caption area */}
      {captionError && (
        <div className="bg-error-container text-error px-6 py-3 text-sm">
          {captionError}
        </div>
      )}
      <main className="flex-1 overflow-hidden p-6 kowhaiwhai-pattern">
        {segments.length === 0 && event.status !== 'live' && (
          <p className="text-secondary text-lg text-center mt-16">
            Waiting for captions to begin…
          </p>
        )}
        <CaptionDisplay
          segments={segments}
          highContrast={highContrast}
          className="h-full"
          style={{ fontSize: `${fontSize}rem` }}
        />
      </main>
    </div>
  )
}

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { EventLobby } from '../components/EventLobby'
import { LanguagePickerModal } from '../components/LanguagePickerModal'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { TranscriptDownload } from '../components/TranscriptDownload'
import { useAccessibility } from '../hooks/useAccessibility'
import { useQA } from '../hooks/useQA'
import { AccessibilityPanel } from '../components/AccessibilityPanel'
import { AskQuestionDrawer } from '../components/AskQuestionDrawer'
import { useViewerCount } from '../hooks/useViewerCount'
import { useDarkModeContext } from '../contexts/DarkModeContext'
import type { Event } from '@caption-aotearoa/shared'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { LogoImg } from '../components/LogoImg'
import { useReactions } from '../hooks/useReactions'
import { ReactionBar } from '../components/ReactionBar'
import { TTS_SUPPORTED_LANGUAGES } from '@caption-aotearoa/shared'

export function EventPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [selectedLocale, setSelectedLocale] = useState('en')
  const [lobbyDismissed, setLobbyDismissed] = useState(false)
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  const { fontSize, setFontSize, highContrast, toggleHighContrast, dyslexiaFont, toggleDyslexiaFont, lineSpacing, setLineSpacing } = useAccessibility()
  const [askDrawerOpen, setAskDrawerOpen] = useState(false)
  const { submitQuestion } = useQA(code ?? '')
  const { reactions, sendReaction } = useReactions(code ?? '')
  const { isDark, toggle } = useDarkModeContext()
  const viewerCount = useViewerCount(code ?? '')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const { isEnabled: audioEnabled, enable: enableAudio, disable: disableAudio } =
    useAudioPlayer(code ?? '', selectedLocale)

  const audioSupported = TTS_SUPPORTED_LANGUAGES.has(selectedLocale)

    // Auto-disable audio when switching to a language with no TTS support
  useEffect(() => {
    if (audioEnabled && !audioSupported) disableAudio()
  }, [audioSupported, audioEnabled, disableAudio])

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
    refetchInterval: 10_000,
  })

  const isConfiguredLanguage = event?.languages.includes(selectedLocale) ?? true

  const { segments, isConnected, error: captionError } = useCaptions(
    code ?? '',
    selectedLocale,
    isConfiguredLanguage,
  )

  useEffect(() => {
    if (event?.status === 'live') setLobbyDismissed(true)
  }, [event?.status])

  const showLobby =
    !lobbyDismissed &&
    event &&
    event.status !== 'live' &&
    event.event_date &&
    new Date(event.event_date).getTime() > Date.now()

  useEffect(() => {
    if (!event?.event_date || lobbyDismissed || event.status === 'live') return
    const diff = new Date(event.event_date).getTime() - Date.now()
    if (diff <= 0) { setLobbyDismissed(true); return }
    const timer = setTimeout(() => setLobbyDismissed(true), diff)
    return () => clearTimeout(timer)
  }, [event?.event_date, event?.status, lobbyDismissed])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-primary)] text-lg">Loading event…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--color-background)]">
        <p className="text-[var(--color-error)] text-lg">Event not found. Check your code and try again.</p>
      </div>
    )
  }

  if (showLobby) return <EventLobby event={event} />

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-[var(--color-background)]${highContrast ? ' high-contrast' : ''}${dyslexiaFont ? ' font-dyslexia' : ''}`}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-background)]/90 backdrop-blur-xl
                         border-b border-[var(--color-outline-variant)] px-6 py-4
                         flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg
                       text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors  border border-[var(--color-outline-variant)]"
            aria-label="Toggle settings"
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarOpen ? 'close' : 'tune'}
            </span>
            
          </button>
          <LogoImg className="h-8" />
          <span className="font-serif  text-lg md:text-xl font-bold text-[var(--color-primary)]">
            HearMe NZ
          </span>
          <div className="hidden md:block w-px h-5 bg-[var(--color-outline-variant)]" />
          {event.status === 'ended' ? (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--color-outline-variant)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-outline)]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Ended</span>
            </div>
          ) : isConnected && event.status === 'live' ? (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border"
                 style={{ background: 'rgba(240,253,244,1)', borderColor: 'rgba(34,197,94,0.3)' }}>
              <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-green-700">Live</span>
              {viewerCount > 0 && (
                <span className="text-xs text-green-700 ml-1">· {viewerCount}</span>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--color-outline-variant)]">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--color-primary-container)]' : 'bg-[var(--color-outline)]'}`} />
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                {isConnected ? 'Connected' : 'Connecting…'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-outline-variant)]
                     text-sm text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          Exit
        </button>
      </header>

      {/* Body row */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar backdrop (mobile) */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed md:static inset-y-0 left-0 z-40 w-72 shrink-0
                          bg-[var(--color-surface-container-low)]
                          border-r border-[var(--color-outline-variant)]
                          p-6 flex flex-col gap-5 overflow-y-auto
                          transition-transform duration-200 ease-in-out
                          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

          {/* Event details */}
          <section className="space-y-1 pb-4 border-b border-[var(--color-outline-variant)]">
            <h2
              className="font-serif text-base font-bold leading-snug text-[var(--color-on-surface)]"
              style={{ color: event.theme_color || undefined }}
            >
              {event.title}
            </h2>
            {event.organiser_name && (
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {event.organiser_name}
              </p>
            )}
            {event.description && (
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-snug pt-0.5">
                {event.description}
              </p>
            )}

            {event.event_date && (
              <p className="text-xs text-[var(--color-on-surface-variant)]">
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
          </section>

        

          {/* Text Size */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Text Size
            </h3>
            <div className="bg-[var(--color-surface-container-lowest)] px-3 py-2.5 rounded-xl
                            border border-[var(--color-outline-variant)] shadow-sm space-y-2">
              <div className="flex justify-between items-center px-0.5">
                <span className="material-symbols-outlined text-[var(--color-primary)]"
                      style={{ fontSize: '14px' }}>text_fields</span>
                <span className="material-symbols-outlined text-[var(--color-primary)]"
                      style={{ fontSize: '22px' }}>text_fields</span>
              </div>
              <input
                type="range"
                min="1.25" max="3" step="0.25"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                aria-label="Text size"
              />
            </div>
          </section>

          {/* Line Spacing */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Line Spacing
            </h3>
            <div className="bg-[var(--color-surface-container-lowest)] px-3 py-2.5 rounded-xl
                            border border-[var(--color-outline-variant)] shadow-sm space-y-2">
              <div className="flex justify-between items-center px-0.5">
                <span className="material-symbols-outlined text-[var(--color-primary)]"
                      style={{ fontSize: '14px' }}>density_small</span>
                <span className="material-symbols-outlined text-[var(--color-primary)]"
                      style={{ fontSize: '14px' }}>density_large</span>
              </div>
              <input
                type="range"
                min="1" max="3" step="1"
                value={lineSpacing === 'compact' ? 1 : lineSpacing === 'normal' ? 2 : 3}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  setLineSpacing(v === 1 ? 'compact' : v === 3 ? 'relaxed' : 'normal')
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                aria-label="Line spacing"
              />
            </div>
          </section>

          {/* Display mode */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Display
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (isDark) toggle() }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                  !isDark
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)]'
                }`}
                aria-pressed={!isDark}
              >
                <div className="w-6 h-6 rounded-full bg-[#fdf9ee] border border-[var(--color-outline-variant)]" />
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Light</span>
              </button>
              <button
                onClick={() => { if (!isDark) toggle() }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                  isDark
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)]'
                }`}
                aria-pressed={isDark}
              >
                <div className="w-6 h-6 rounded-full bg-[#0a0a0c]" />
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Dark</span>
              </button>
            </div>
          </section>

          {/* Accessibility */}
          <AccessibilityPanel
            highContrast={highContrast}
            onToggleHighContrast={toggleHighContrast}
            dyslexiaFont={dyslexiaFont}
            onToggleDyslexiaFont={toggleDyslexiaFont}
            lineSpacing={lineSpacing}
            onSetLineSpacing={setLineSpacing}
          />

          {/* Language & session */}
          <div className="mt-auto pt-6 border-t border-[var(--color-outline-variant)]">
            <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]
                            rounded-xl p-4 space-y-3">
              <button
                onClick={() => setLangPickerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                           bg-[var(--color-surface-container-high)]
                           text-[var(--color-on-surface)]
                           border border-[var(--color-outline-variant)]
                           hover:bg-[var(--color-surface-container-highest)] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">translate</span>
                <span className="flex-1 text-left truncate">
                  {(() => {
                    const lang = NZ_LANGUAGES.find((l) => l.code === selectedLocale)
                    return lang ? `${lang.flag ?? ''} ${lang.label}`.trim() : selectedLocale
                  })()}
                </span>
                <svg className="w-3 h-3 opacity-60 shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {audioSupported && (
                <button
                  onClick={audioEnabled ? disableAudio : enableAudio}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                             border transition-colors ${
                    audioEnabled
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                      : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)]'
                  }`}
                  aria-pressed={audioEnabled}
                  aria-label={audioEnabled ? 'Disable audio translation' : 'Enable audio translation'}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {audioEnabled ? 'volume_up' : 'volume_off'}
                  </span>
                  <span>{audioEnabled ? 'Audio on' : 'Play audio'}</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Language picker modal — rendered outside the sidebar so it covers full screen */}
        <LanguagePickerModal
          isOpen={langPickerOpen}
          onClose={() => setLangPickerOpen(false)}
          selectedLocale={selectedLocale}
          onSelect={setSelectedLocale}
          showAudioIndicator
        />

        {/* Caption canvas */}
        <section className="flex-1 min-w-0 relative flex flex-col p-4 md:p-8 lg:p-12 overflow-hidden">
          <KowhaiwhaPattern opacity={0.03} />

          {/* Floating emoji reactions */}
          {reactions.map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute bottom-24 text-3xl animate-float-up"
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </span>
          ))}

          {captionError && (
            <div className="absolute top-0 inset-x-0 z-20 bg-[var(--color-error)] text-white px-6 py-3 text-sm">
              {captionError}
            </div>
          )}


          <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
            {segments.length === 0 && event.status === 'live' ? (
              <div className="flex items-center gap-2 py-6">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : segments.length === 0 ? (
              <p className="text-[var(--color-primary)] opacity-50 text-lg mt-16">
                Waiting for captions to begin…
              </p>
            ) : (
              <CaptionDisplay
                segments={segments}
                variant="flat"
                className="flex-1"
                highContrast={highContrast}
                style={{
                  fontSize: `${fontSize}rem`,
                  lineHeight: lineSpacing === 'compact' ? 1.3 : lineSpacing === 'relaxed' ? 2.2 : 1.6,
                }}
              />
            )}
          </div>

          <div className="relative z-10 mt-8 flex justify-between items-center
                          border-t border-[var(--color-outline-variant)] pt-6 shrink-0">
            <div className="flex gap-2">
              {event.status === 'ended' && (
                <TranscriptDownload
                  eventCode={event.code}
                  eventTitle={event.title}
                  eventDate={event.event_date}
                />
              )}
              {event.status !== 'ended' && (
                <button
                  onClick={() => setAskDrawerOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                             bg-[var(--color-primary)] text-[var(--color-on-primary)]
                             hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">question_answer</span>
                  Ask a question
                </button>
              )}
            </div>
            {event.status !== 'ended' && (
              <ReactionBar onReact={sendReaction} />
            )}
          </div>
        </section>
      </div>

      <AskQuestionDrawer
        isOpen={askDrawerOpen}
        onClose={() => setAskDrawerOpen(false)}
        onSubmit={submitQuestion}
        language={selectedLocale}
      />
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Check, X, Square, ExternalLink, CheckCircle, Sparkles, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { MicControl } from '../components/MicControl'
import { QRDisplay } from '../components/QRDisplay'
import { TranscriptDownload } from '../components/TranscriptDownload'
import { DashboardShell } from '../components/DashboardShell'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { LanguagePickerModal } from '../components/LanguagePickerModal'
import { useViewerCount } from '../hooks/useViewerCount'
import { useReactions } from '../hooks/useReactions'
import { FloatingReactions } from '../components/FloatingReactions'
import type { Event } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import type { NzLanguage } from '@caption-aotearoa/shared/nzLanguages'
import { RECOGNITION_LOCALES } from '@caption-aotearoa/shared/recognitionLocales'

/** Māori uses Papa Reo on the backend — add it separately to the UI map. */
const PRESENTER_LOCALES: Record<string, string> = { ...RECOGNITION_LOCALES, mi: 'mi-NZ' }

export function PresentPage() {
  const { code } = useParams<{ code: string }>()
  const queryClient = useQueryClient()
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
  })

  const navigate = useNavigate()
  const [speakerLocale, setSpeakerLocale] = useState<string | undefined>(undefined)
  const [isDualMode, setIsDualMode] = useState(false)
  const [langPickerOpen, setLangPickerOpen] = useState(false)

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [editDate, setEditDate] = useState('')

  const [sessionEnded, setSessionEnded] = useState(false)
  const [generating, setGenerating] = useState(false)

  const { data: transcriptData, refetch: refetchTranscript } = useQuery({
    queryKey: ['transcript', code],
    queryFn: () => api.get<{ status: string }>(`/api/events/${code}/transcript`).then((r) => r.data),
    enabled: sessionEnded,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'pending' || s === 'processing' ? 3000 : false
    },
  })

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const captureStartRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (event?.status === 'ended') setSessionEnded(true)
  }, [event?.status])

  const { isCapturing, start, stop, error: audioError } = useAudioCapture(code ?? '')
  const viewerCount = useViewerCount(code ?? '')
  const { reactions } = useReactions(code ?? '')

  useEffect(() => {
    if (isCapturing) {
      captureStartRef.current = Date.now() - elapsedSeconds * 1000
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - (captureStartRef.current ?? Date.now())) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCapturing])
  const { segments } = useCaptions(code ?? '', speakerLocale ?? 'en-NZ')

  const updateEvent = useMutation({
    mutationFn: (patch: Partial<Pick<Event, 'title' | 'description' | 'event_date'>>) =>
      api.patch(`/api/events/${code}`, patch).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', code] }),
  })

  const hasBilingual =
    event?.languages.includes('en') && event?.languages.includes('mi')

  async function handleStart() {
    await api.patch(`/api/events/${code}/status`, { status: 'live' })
    await start(speakerLocale)
  }

  function handleStop() {
    // Just stop the audio capture — does NOT end the event
    stop()
  }

  async function handleEndSession() {
    stop()
    await api.patch(`/api/events/${code}/status`, { status: 'ended' })
    setSessionEnded(true)
  }

  async function handleGenerateTranscript() {
    setGenerating(true)
    try {
      await api.post(`/api/events/${code}/transcript/retry`)
      refetchTranscript()
    } finally {
      setGenerating(false)
    }
  }

  function handleLanguageChange(azureCode: string) {
    if (isDualMode) {
      setIsDualMode(false)
      if (code) socket.emit('session:set-mode', { code, mode: 'single' })
    }
    const bcp47 = PRESENTER_LOCALES[azureCode] ?? azureCode
    setSpeakerLocale(bcp47)
    if (code) socket.emit('session:set-language', { code, locale: bcp47 })
  }

  function handleToggleDual() {
    const newMode = !isDualMode
    setIsDualMode(newMode)
    if (code) socket.emit('session:set-mode', { code, mode: newMode ? 'dual' : 'single' })
  }

  function handleSpeakerSelect(langCode: string) {
    setLangPickerOpen(false)
    if (langCode === 'dual') {
      if (!isDualMode) handleToggleDual()
    } else {
      handleLanguageChange(langCode)
    }
  }

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-on-surface)] text-lg">Loading…</p>
      </div>
    )
  }

  const speakerLanguages = event.languages.filter((l) => l in PRESENTER_LOCALES)

  const speakerLangList: NzLanguage[] = [
    ...speakerLanguages.map((code) => ({
      code,
      label: NZ_LANGUAGES.find((l) => l.code === code)?.label ?? code,
      flag:  NZ_LANGUAGES.find((l) => l.code === code)?.flag,
    })),
    ...(hasBilingual
      ? [{ code: 'dual', label: 'English + Te Reo', flag: '🇳🇿' }]
      : []),
  ]

  const activeSpeakerCode: string = isDualMode
    ? 'dual'
    : (Object.keys(PRESENTER_LOCALES).find(
        (k) => PRESENTER_LOCALES[k] === speakerLocale
      ) ?? speakerLanguages[0] ?? 'en')

  const activeLang = speakerLangList.find((l) => l.code === activeSpeakerCode)

  const elapsedFormatted = [
    Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0'),
    Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0'),
    (elapsedSeconds % 60).toString().padStart(2, '0'),
  ].join(':')

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-NZ', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null

  // ISO-local string for datetime-local input (strip seconds/ms)
  const dateForInput = event.event_date
    ? new Date(event.event_date).toISOString().slice(0, 16)
    : ''

  return (
    <>
    <LanguagePickerModal
      isOpen={langPickerOpen}
      onClose={() => setLangPickerOpen(false)}
      selectedLocale={activeSpeakerCode}
      onSelect={handleSpeakerSelect}
      languages={speakerLangList}
    />
    <DashboardShell
      fillMain
      headerActions={
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]
                     hover:text-[var(--color-on-surface)] transition-colors"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>
      }
      left={
        <div className="flex flex-col gap-5 h-full">
          {/* Editable event title */}
          <div>
            {editingTitle ? (
              <div className="flex items-start gap-1">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 font-serif text-lg font-semibold bg-transparent border-b border-[var(--color-primary)]
                             text-[var(--color-on-surface)] outline-none leading-snug"
                />
                <button
                  onClick={() => {
                    updateEvent.mutate({ title: editTitle })
                    setEditingTitle(false)
                  }}
                  className="p-1 text-[var(--color-primary)] hover:opacity-80"
                  aria-label="Save title"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="p-1 text-[var(--color-on-surface-variant)] hover:opacity-80"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="group flex items-start gap-1">
                <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] leading-snug flex-1">
                  {event.title}
                </h2>
                <button
                  onClick={() => { setEditTitle(event.title); setEditingTitle(true) }}
                  className="p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[var(--color-on-surface-variant)] transition-opacity"
                  aria-label="Edit title"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}

            {/* Editable description */}
            {editingDesc ? (
              <div className="flex items-start gap-1 mt-2">
                <textarea
                  autoFocus
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="flex-1 text-sm bg-transparent border-b border-[var(--color-primary)]
                             text-[var(--color-on-surface-variant)] outline-none resize-none"
                />
                <button
                  onClick={() => {
                    updateEvent.mutate({ description: editDesc })
                    setEditingDesc(false)
                  }}
                  className="p-1 text-[var(--color-primary)] hover:opacity-80"
                  aria-label="Save description"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingDesc(false)}
                  className="p-1 text-[var(--color-on-surface-variant)] hover:opacity-80"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="group flex items-start gap-1 mt-1">
                <p className="text-sm text-[var(--color-on-surface-variant)] flex-1">
                  {event.description || <span className="opacity-40 italic">No description</span>}
                </p>
                <button
                  onClick={() => { setEditDesc(event.description ?? ''); setEditingDesc(true) }}
                  className="p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[var(--color-on-surface-variant)] transition-opacity"
                  aria-label="Edit description"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}

            {/* Editable date */}
            {editingDate ? (
              <div className="flex items-center gap-1 mt-2">
                <input
                  autoFocus
                  type="datetime-local"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="flex-1 text-xs bg-transparent border-b border-[var(--color-primary)]
                             text-[var(--color-on-surface-variant)] outline-none"
                />
                <button
                  onClick={() => {
                    updateEvent.mutate({ event_date: editDate ? new Date(editDate).toISOString() : undefined })
                    setEditingDate(false)
                  }}
                  className="p-1 text-[var(--color-primary)] hover:opacity-80"
                  aria-label="Save date"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingDate(false)}
                  className="p-1 text-[var(--color-on-surface-variant)] hover:opacity-80"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-1 mt-2">
                <p className="text-xs text-[var(--color-on-surface-variant)] flex-1">
                  {formattedDate ?? <span className="opacity-40 italic">No date set</span>}
                </p>
                <button
                  onClick={() => { setEditDate(dateForInput); setEditingDate(true) }}
                  className="p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[var(--color-on-surface-variant)] transition-opacity"
                  aria-label="Edit date"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isCapturing ? 'bg-red-500 animate-pulse' : 'bg-[var(--color-outline)]'
              }`} />
              <span className="text-sm text-[var(--color-on-surface-variant)]">
                {isCapturing ? 'Live' : 'Ready'}
              </span>
              {viewerCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-[var(--color-on-surface-variant)] ml-1">
                  <span className="material-symbols-outlined text-[15px]">group</span>
                  {viewerCount}
                </span>
              )}
            </div>

            <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-0.5">
                Elapsed
              </p>
              <p className="font-mono text-lg font-semibold text-[var(--color-on-surface)] tabular-nums">
                {elapsedFormatted}
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--color-outline-variant)]" />

          {/* Language selector */}
          {speakerLangList.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest">
                I am speaking in
              </p>
              <button
                onClick={() => setLangPickerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                           bg-[var(--color-surface-container-high)]
                           text-[var(--color-on-surface)]
                           border border-[var(--color-outline-variant)]
                           hover:bg-[var(--color-surface-container-highest)] transition-colors"
              >
                <span className="text-base leading-none">{activeLang?.flag ?? '🌐'}</span>
                <span className="flex-1 text-left truncate">{activeLang?.label ?? activeSpeakerCode}</span>
                <svg className="w-3 h-3 opacity-60 shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <LanguagePickerModal
                isOpen={langPickerOpen}
                onClose={() => setLangPickerOpen(false)}
                selectedLocale={activeSpeakerCode}
                onSelect={handleSpeakerSelect}
                languages={speakerLangList}
              />
            </div>
          )}

          <div className="border-t border-[var(--color-outline-variant)]" />

          {/* Audience Joining */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Audience Joining
            </h3>
            <QRDisplay eventCode={event.code} />
            <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4 space-y-3">
              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)] mb-1">Event code</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-[var(--color-on-surface)]">
                  {event.code}
                </p>
              </div>
              <div className="border-t border-[var(--color-outline-variant)] pt-3">
                <p className="text-xs text-[var(--color-on-surface-variant)] mb-1">Join link</p>
                <a
                  href={`${window.location.origin}/event/${event.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-1.5 font-mono text-xs text-[var(--color-primary)]
                             hover:underline break-all"
                >
                  <ExternalLink size={12} className="shrink-0 mt-0.5" />
                  {window.location.origin}/event/{event.code}
                </a>
              </div>
            </div>
          </div>

          {/* Kowhaiwhai decorative pattern at bottom */}
          <div className="mt-auto opacity-10 pointer-events-none">
            <KowhaiwhaPattern />
          </div>
        </div>
      }
      main={
        <div className="h-full flex flex-col gap-6">
          {/* Session Controls Panel */}
          <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] overflow-hidden shrink-0">
            <div className="px-5 py-3 border-b border-[var(--color-outline-variant)] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Session Controls
              </h3>
              <div className="flex items-center gap-2">
                {sessionEnded ? (
                  <>
                    <CheckCircle size={14} className="text-[var(--color-primary)]" />
                    <span className="text-xs text-[var(--color-primary)] font-medium">Session Ended</span>
                  </>
                ) : (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-green-500' : 'bg-[var(--color-outline)]'}`} />
                    <span className="text-xs text-[var(--color-on-surface-variant)]">
                      {isCapturing ? 'Streaming' : 'Idle'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {sessionEnded ? (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
                  <CheckCircle size={20} className="text-[var(--color-primary)] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-on-surface)]">Session complete</p>
                    <p className="text-xs">Duration: {elapsedFormatted}</p>
                  </div>
                </div>
                <div className="border-t border-[var(--color-outline-variant)] pt-4 flex flex-wrap gap-3">
                  {(() => {
                    const ts = transcriptData?.status
                    const isProcessing = generating || ts === 'pending' || ts === 'processing'
                    const isReady = ts === 'ready'
                    const isFailed = ts === 'failed'
                    return (
                      <button
                        onClick={handleGenerateTranscript}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                                   bg-[var(--color-primary-fixed)] text-[var(--color-primary)]
                                   hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing
                          ? <Loader2 size={15} className="animate-spin" />
                          : isReady
                          ? <CheckCircle size={15} />
                          : <Sparkles size={15} />
                        }
                        {isProcessing
                          ? 'Processing…'
                          : isReady
                          ? 'Regenerate Transcript'
                          : isFailed
                          ? 'Retry Transcript'
                          : 'Generate Transcript (AI Assist)'
                        }
                      </button>
                    )
                  })()}
                  <TranscriptDownload
                    eventCode={event.code}
                    eventTitle={event.title}
                    eventDate={event.event_date}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 md:p-5">
              {/* Mobile: language selector visible inline */}
              {speakerLangList.length > 0 && (
                <div className="lg:hidden mb-4">
                  <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">
                    I am speaking in
                  </p>
                  <button
                    onClick={() => setLangPickerOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                               bg-[var(--color-surface-container-high)]
                               text-[var(--color-on-surface)]
                               border border-[var(--color-outline-variant)]
                               hover:bg-[var(--color-surface-container-highest)] transition-colors"
                  >
                    <span className="text-base leading-none">{activeLang?.flag ?? '🌐'}</span>
                    <span className="flex-1 text-left truncate">{activeLang?.label ?? activeSpeakerCode}</span>
                    <svg className="w-3 h-3 opacity-60 shrink-0" viewBox="0 0 12 12" fill="none">
                      <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex items-end justify-center gap-6 md:gap-8">
                <MicControl
                  isCapturing={isCapturing}
                  onStart={handleStart}
                  onStop={handleStop}
                  error={audioError}
                />
                <div className="flex flex-col items-center gap-3 md:gap-4">
                  <button
                    onClick={handleEndSession}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all
                               shadow-lg text-white bg-[var(--color-error)] hover:opacity-90"
                    aria-label="End session"
                  >
                    <Square size={28} className="md:hidden" />
                    <Square size={32} className="hidden md:block" />
                  </button>
                  <p className="text-xs md:text-sm font-medium text-[var(--color-on-surface-variant)]">End Session</p>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Live Transcript Panel — fills remaining space */}
          <div className="flex-1 flex flex-col rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] overflow-hidden min-h-0 relative">
            <FloatingReactions reactions={reactions} />
            <div className="px-5 py-3 border-b border-[var(--color-outline-variant)] shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Live Transcript
              </h3>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <CaptionDisplay
                segments={segments}
                className="h-full bg-[var(--color-surface-container)] rounded-lg p-4"
              />
            </div>
          </div>
        </div>
      }
    />
    </>
  )
}

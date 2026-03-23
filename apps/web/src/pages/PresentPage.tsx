import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Check, X, Square } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { MicControl } from '../components/MicControl'
import { QRDisplay } from '../components/QRDisplay'
import { DashboardShell } from '../components/DashboardShell'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { LanguagePickerModal } from '../components/LanguagePickerModal'
import { useViewerCount } from '../hooks/useViewerCount'
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

  const { isCapturing, start, stop, error: audioError } = useAudioCapture(code ?? '')
  const viewerCount = useViewerCount(code ?? '')
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
    navigate('/dashboard')
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
    <DashboardShell
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

          {/* Kowhaiwhai decorative pattern at bottom */}
          <div className="mt-auto opacity-10 pointer-events-none">
            <KowhaiwhaPattern />
          </div>
        </div>
      }
      main={
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-6">
            <MicControl
              isCapturing={isCapturing}
              onStart={handleStart}
              onStop={handleStop}
              error={audioError}
            />
            <button
              onClick={handleEndSession}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium
                         border border-[var(--color-error)] text-[var(--color-error)]
                         hover:bg-[var(--color-error)] hover:text-white transition-colors"
            >
              <Square size={14} />
              End Session
            </button>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">
              Live transcript
            </p>
            <CaptionDisplay
              segments={segments}
              className="h-64 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl p-4"
            />
          </div>
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
        </div>
      }
    />
  )
}

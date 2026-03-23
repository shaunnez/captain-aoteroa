import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
  })

  const navigate = useNavigate()
  const [speakerLocale, setSpeakerLocale] = useState<string | undefined>(undefined)
  const [isDualMode, setIsDualMode] = useState(false)
  const [langPickerOpen, setLangPickerOpen] = useState(false)

  const { isCapturing, start, stop, error: audioError } = useAudioCapture(code ?? '')
  const viewerCount = useViewerCount(code ?? '')
  const { segments } = useCaptions(code ?? '', speakerLocale ?? 'en-NZ')

  const hasBilingual =
    event?.languages.includes('en') && event?.languages.includes('mi')

  async function handleStart() {
    await api.patch(`/api/events/${code}/status`, { status: 'live' })
    await start()
  }

  async function handleStop() {
    stop()
    await api.patch(`/api/events/${code}/status`, { status: 'ended' })
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
      // Only toggle on if not already in dual mode — selecting it again is a no-op
      if (!isDualMode) handleToggleDual()
    } else {
      // handleLanguageChange already exits dual mode internally if needed
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

  // Build the language list for the modal: event speaker languages + bilingual option
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

  // The currently active code shown on the trigger pill
  const activeSpeakerCode: string = isDualMode
    ? 'dual'
    : (Object.keys(PRESENTER_LOCALES).find(
        (k) => PRESENTER_LOCALES[k] === speakerLocale
      ) ?? speakerLanguages[0] ?? 'en')

  const activeLang = speakerLangList.find((l) => l.code === activeSpeakerCode)

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
          {/* Event info */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] leading-snug">
              {event.title}
            </h2>
            <div className="flex items-center gap-2 mt-2">
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
          <MicControl
            isCapturing={isCapturing}
            onStart={handleStart}
            onStop={handleStop}
            error={audioError}
          />
          <div>
            <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">
              Live preview
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

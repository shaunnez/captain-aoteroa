import { useState } from 'react'
import { useParams } from 'react-router-dom'
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
import { useViewerCount } from '../hooks/useViewerCount'
import type { Event } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
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

  const [speakerLocale, setSpeakerLocale] = useState<string | undefined>(undefined)
  const [isDualMode, setIsDualMode] = useState(false)

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

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-on-surface)] text-lg">Loading…</p>
      </div>
    )
  }

  const speakerLanguages = event.languages.filter((l) => l in PRESENTER_LOCALES)

  return (
    <DashboardShell
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
          {speakerLanguages.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest">
                I am speaking in
              </p>
              <div className="flex flex-wrap gap-2">
                {speakerLanguages.map((azureCode, i) => {
                  const bcp47 = PRESENTER_LOCALES[azureCode]
                  const isActive =
                    !isDualMode &&
                    (speakerLocale === bcp47 || (speakerLocale === undefined && i === 0))
                  return (
                    <button
                      key={azureCode}
                      onClick={() => handleLanguageChange(azureCode)}
                      className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary-container)] text-white border-[var(--color-primary-container)]'
                          : 'bg-transparent text-[var(--color-on-surface)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary-container)]'
                      }`}
                    >
                      {NZ_LANGUAGES.find((l) => l.code === azureCode)?.label ?? azureCode}
                    </button>
                  )
                })}
                {hasBilingual && (
                  <button
                    onClick={handleToggleDual}
                    className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                      isDualMode
                        ? 'bg-[var(--color-primary-container)] text-white border-[var(--color-primary-container)]'
                        : 'bg-transparent text-[var(--color-on-surface)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary-container)]'
                    }`}
                  >
                    English + Te Reo
                  </button>
                )}
              </div>
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

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
import { useViewerCount } from '../hooks/useViewerCount'
import { Users } from 'lucide-react'
import type { Event } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import { RECOGNITION_LOCALES } from '@caption-aotearoa/shared/recognitionLocales'

/** Māori uses Papa Reo on the backend — add it separately to the UI map. */
const PRESENTER_LOCALES: Record<string, string> = { ...RECOGNITION_LOCALES, 'mi': 'mi-NZ' }

export function PresentPage() {
  const { code } = useParams<{ code: string }>()
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
  })

  // undefined = server default (languages[0]); string = manually selected locale
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
    if (code) {
      socket.emit('session:set-mode', { code, mode: newMode ? 'dual' : 'single' })
    }
  }

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-secondary">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col kowhaiwhai-pattern">
      <header className="bg-surface-container-lowest/95 backdrop-blur-sm text-on-surface px-6 py-4 flex items-center justify-between border-b border-outline-variant/20">
        <h1 className="font-headline text-xl font-semibold">{event.title}</h1>
        <div className="flex items-center gap-4">
          {viewerCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-secondary">
              <Users size={16} className="text-secondary" />
              {viewerCount} viewing
            </span>
          )}
          <QRDisplay eventCode={event.code} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center gap-8 p-8">
        <MicControl
          isCapturing={isCapturing}
          onStart={handleStart}
          onStop={handleStop}
          error={audioError}
        />

        {Object.keys(PRESENTER_LOCALES).some((c) => event.languages.includes(c)) && (
          <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
            <p className="text-sm font-medium text-secondary uppercase tracking-wide">
              I am speaking in
            </p>
            <div className="flex gap-2 flex-wrap justify-center max-h-40 overflow-y-auto py-1">
              {event.languages.filter((l) => l in PRESENTER_LOCALES).map((azureCode, i) => {
                const bcp47 = PRESENTER_LOCALES[azureCode]
                return (
                <button
                  key={azureCode}
                  onClick={() => handleLanguageChange(azureCode)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium border-2 transition-colors ${
                    !isDualMode && (speakerLocale === bcp47 || (speakerLocale === undefined && i === 0))
                      ? 'bg-surface-container-high text-on-surface border-primary'
                      : 'bg-surface-container text-secondary border-outline-variant'
                  }`}
                >
                  {NZ_LANGUAGES.find((l) => l.code === azureCode)?.label ?? azureCode}
                </button>
                )
              })}
            </div>

            {hasBilingual && (
              <button
                onClick={handleToggleDual}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium border-2 transition-colors mt-2 ${
                  isDualMode
                    ? 'bg-surface-container-high text-on-surface border-primary'
                    : 'bg-surface-container text-secondary border-outline-variant'
                }`}
              >
                English + Te Reo (bilingual)
              </button>
            )}
          </div>
        )}

        <div className="w-full max-w-2xl">
          <p className="text-sm font-medium text-secondary mb-2 uppercase tracking-wide">
            Live preview
          </p>
          <CaptionDisplay
            segments={segments}
            className="h-64 bg-surface-container-low border border-outline-variant/20 rounded-xl"
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-secondary">
            Audience join URL:{' '}
            <a href={`${window.location.origin}/event/${event.code}`} target="_blank">
              <span className="font-mono font-semibold text-primary">
                {window.location.origin}/event/{event.code}
              </span>
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

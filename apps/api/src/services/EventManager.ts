import { AzureSession } from './AzureSession'
import { DualAzureSession } from './DualAzureSession'
import { PapaReoSession } from './PapaReoSession'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface SessionOptions {
  languages: string[]
}

type OnSegment = (payload: CaptionSegmentPayload) => void
type OnError = (message: string, fatal: boolean) => void

interface SessionEntry {
  session: AzureSession | DualAzureSession | PapaReoSession
  options: SessionOptions
  eventCode: string
  onSegment: OnSegment
  onError: OnError
}

class EventManagerClass {
  private sessions = new Map<string, SessionEntry>()

  async start(
    code: string,
    options: SessionOptions,
    onSegment: OnSegment,
    onError: OnError,
  ): Promise<void> {
    if (this.sessions.has(code)) await this.end(code)

    const session = new AzureSession({
      eventCode: code,
      languages: options.languages,
      speakerLocale: 'en-NZ',
      onSegment,
      onError: async (message, fatal) => {
        onError(message, fatal)
        if (!fatal) {
          try {
            await session.restart()
          } catch (e) {
            onError(`Restart failed: ${e}`, true)
            this.sessions.delete(code)
          }
        } else {
          this.sessions.delete(code)
        }
      },
    })

    await session.start()
    this.sessions.set(code, { session, options, eventCode: code, onSegment, onError })
  }

  pushChunk(code: string, chunk: Buffer): void {
    this.sessions.get(code)?.session.pushChunk(chunk)
  }

  async setLanguage(code: string, locale: string | null): Promise<void> {
    const entry = this.sessions.get(code)
    if (!entry) return

    // If in dual mode, switch back to single mode first
    if (entry.session instanceof DualAzureSession) {
      await this.setMode(code, 'single')
    }

    const needsPapaReo = locale === 'mi-NZ'
    const currentIsPapaReo = entry.session instanceof PapaReoSession

    if (needsPapaReo && !currentIsPapaReo) {
      // Switch from Azure → Papa Reo
      try { await entry.session.stop() } catch { /* ignore */ }

      const papaReoSession = new PapaReoSession({
        eventCode: entry.eventCode,
        onSegment: entry.onSegment,
        onError: (message, fatal) => {
          entry.onError(message, fatal)
          if (fatal) this.sessions.delete(code)
        },
      })
      await papaReoSession.start()
      entry.session = papaReoSession
    } else if (!needsPapaReo && currentIsPapaReo) {
      // Switch from Papa Reo → Azure
      try { await entry.session.stop() } catch { /* ignore */ }

      const azureSession = new AzureSession({
        eventCode: entry.eventCode,
        languages: entry.options.languages,
        speakerLocale: locale,
        onSegment: entry.onSegment,
        onError: async (message, fatal) => {
          entry.onError(message, fatal)
          if (!fatal) {
            try { await azureSession.restart() } catch (e) {
              entry.onError(`Restart failed: ${e}`, true)
              this.sessions.delete(code)
            }
          } else {
            this.sessions.delete(code)
          }
        },
      })
      await azureSession.start()
      entry.session = azureSession
    } else if (!needsPapaReo && entry.session instanceof AzureSession) {
      // Stay on Azure, just change language
      await entry.session.setLanguage(locale)
    }
  }

  async setMode(code: string, mode: 'single' | 'dual'): Promise<void> {
    const entry = this.sessions.get(code)
    if (!entry) return

    // Stop current session
    try { await entry.session.stop() } catch { /* ignore */ }

    if (mode === 'dual') {
      const dualSession = new DualAzureSession({
        eventCode: entry.eventCode,
        languages: entry.options.languages,
        onSegment: entry.onSegment,
        onError: async (message, fatal) => {
          entry.onError(message, fatal)
          if (fatal) this.sessions.delete(code)
        },
      })
      await dualSession.start()
      entry.session = dualSession
    } else {
      const singleSession = new AzureSession({
        eventCode: entry.eventCode,
        languages: entry.options.languages,
        onSegment: entry.onSegment,
        onError: async (message, fatal) => {
          entry.onError(message, fatal)
          if (!fatal) {
            try { await singleSession.restart() } catch (e) {
              entry.onError(`Restart failed: ${e}`, true)
              this.sessions.delete(code)
            }
          } else {
            this.sessions.delete(code)
          }
        },
      })
      await singleSession.start()
      entry.session = singleSession
    }
  }

  async end(code: string): Promise<void> {
    const entry = this.sessions.get(code)
    if (!entry) return
    this.sessions.delete(code)
    try { await entry.session.stop() } catch { /* ignore */ }
  }

  has(code: string): boolean {
    return this.sessions.has(code)
  }

  // Test helper
  clear(): void {
    this.sessions.clear()
  }
}

export const EventManager = new EventManagerClass()

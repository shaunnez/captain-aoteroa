import { AzureSession, type SequenceCounter } from './AzureSession'
import { DualAzureSession } from './DualAzureSession'
import { PapaReoSession } from './PapaReoSession'
import { OpenAiSttSession } from './OpenAiSttSession'
import { config } from '../config'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface SessionOptions {
  speakerLocale?: string
}

type OnSegment = (payload: CaptionSegmentPayload) => void
type OnError = (message: string, fatal: boolean) => void

type MaoriSttSession = PapaReoSession | OpenAiSttSession

interface SessionEntry {
  session: AzureSession | DualAzureSession | MaoriSttSession
  options: SessionOptions
  eventCode: string
  onSegment: OnSegment
  onError: OnError
}

class EventManagerClass {
  private sessions = new Map<string, SessionEntry>()

  /** Create the best available te reo STT session: OpenAI if key set, Papa Reo otherwise. */
  private createMaoriSession(
    eventCode: string,
    onSegment: OnSegment,
    onError: (msg: string, fatal: boolean) => void,
    sharedSequence?: SequenceCounter,
  ): MaoriSttSession {
    if (config.openaiApiKey) {
      return new OpenAiSttSession({ apiKey: config.openaiApiKey, eventCode, onSegment, onError, sharedSequence })
    }
    return new PapaReoSession({ eventCode, onSegment, onError, sharedSequence })
  }

  async start(
    code: string,
    options: SessionOptions,
    onSegment: OnSegment,
    onError: OnError,
  ): Promise<void> {
    if (this.sessions.has(code)) await this.end(code)

    let session: AzureSession | MaoriSttSession

    if (options.speakerLocale === 'mi-NZ') {
      const maoriSession = this.createMaoriSession(code, onSegment, (message, fatal) => {
        onError(message, fatal)
        if (fatal) this.sessions.delete(code)
      })
      await maoriSession.start()
      session = maoriSession
    } else {
      const azureSession = new AzureSession({
        eventCode: code,
        speakerLocale: options.speakerLocale ?? 'en-NZ',
        onSegment,
        onError: async (message, fatal) => {
          onError(message, fatal)
          if (!fatal) {
            try {
              await azureSession.restart()
            } catch (e) {
              onError(`Restart failed: ${e}`, true)
              this.sessions.delete(code)
            }
          } else {
            this.sessions.delete(code)
          }
        },
      })
      await azureSession.start()
      session = azureSession
    }

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

    const needsMaori = locale === 'mi-NZ'
    const currentIsMaori = entry.session instanceof PapaReoSession || entry.session instanceof OpenAiSttSession

    if (needsMaori && !currentIsMaori) {
      // Switch from Azure → Māori STT
      try { await entry.session.stop() } catch { /* ignore */ }

      const maoriSession = this.createMaoriSession(entry.eventCode, entry.onSegment, (message, fatal) => {
        entry.onError(message, fatal)
        if (fatal) this.sessions.delete(code)
      })
      await maoriSession.start()
      entry.session = maoriSession
    } else if (!needsMaori && currentIsMaori) {
      // Switch from Papa Reo → Azure
      try { await entry.session.stop() } catch { /* ignore */ }

      const azureSession = new AzureSession({
        eventCode: entry.eventCode,
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
    } else if (!needsMaori && entry.session instanceof AzureSession) {
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

import { AzureSession } from './AzureSession'
import type { SequenceCounter } from './AzureSession'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface DualAzureSessionOptions {
  eventCode: string
  onSegment: (payload: CaptionSegmentPayload) => void
  onError?: (message: string, fatal: boolean) => void
}

/**
 * Wraps two AzureSession instances (en-NZ + mi-NZ) for bilingual recognition.
 * Both receive the same audio chunks and translate to all configured target languages.
 * A shared sequence counter prevents the two sessions from producing conflicting numbers.
 */
export class DualAzureSession {
  private sessions: AzureSession[] = []
  private options: DualAzureSessionOptions
  private sharedSequence: SequenceCounter = { value: 0 }

  constructor(options: DualAzureSessionOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    const { eventCode, onSegment, onError } = this.options

    const enSession = new AzureSession({
      eventCode,
      speakerLocale: 'en-NZ',
      languages: [],
      onSegment,
      onError,
      sharedSequence: this.sharedSequence,
    })

    const miSession = new AzureSession({
      eventCode,
      speakerLocale: 'mi-NZ',
      languages: [],
      onSegment,
      onError,
      sharedSequence: this.sharedSequence,
    })

    this.sessions = [enSession, miSession]
    await Promise.all(this.sessions.map((s) => s.start()))
  }

  pushChunk(chunk: Buffer): void {
    for (const session of this.sessions) {
      session.pushChunk(chunk)
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.sessions.map((s) => s.stop().catch(() => {})))
    this.sessions = []
  }

  async restart(): Promise<void> {
    await Promise.all(this.sessions.map((s) => s.restart()))
  }

  async setLanguage(locale: string | null): Promise<void> {
    // In dual mode, setLanguage doesn't apply — switch back to single mode via EventManager
    // This is a no-op; EventManager handles mode switching
  }
}

import { WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import { supabase } from './supabase'
import type { SequenceCounter } from './AzureSession'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface PapaReoSessionOptions {
  eventCode: string
  onSegment: (payload: CaptionSegmentPayload) => void
  onError?: (message: string, fatal: boolean) => void
  sharedSequence?: SequenceCounter
}

export class PapaReoSession {
  private options: PapaReoSessionOptions
  private ws: WebSocket | null = null
  private ownSequence = 0
  private eventId: string | null = null

  constructor(options: PapaReoSessionOptions) {
    this.options = options
  }

  private get sequence(): number {
    return this.options.sharedSequence ? this.options.sharedSequence.value : this.ownSequence
  }

  private set sequence(val: number) {
    if (this.options.sharedSequence) {
      this.options.sharedSequence.value = val
    } else {
      this.ownSequence = val
    }
  }

  async start(): Promise<void> {
    // Fetch event UUID for DB inserts
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('code', this.options.eventCode)
      .single()
    this.eventId = data?.id ?? null

    // Resume sequence from last persisted segment
    if (this.eventId) {
      const { data: maxRow } = await supabase
        .from('caption_segments')
        .select('sequence')
        .eq('event_id', this.eventId)
        .order('sequence', { ascending: false })
        .limit(1)
        .single()
      if (maxRow && maxRow.sequence > this.sequence) {
        this.sequence = maxRow.sequence
      }
    }

    // Create Papa Reo session
    const res = await fetch(`${config.papaReo.apiUrl}/tuhi/create_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.papaReo.token}`,
      },
      body: JSON.stringify({
        media_encoding: 'pcm',
        sample_rate: 16000,
        number_of_channels: 1,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Papa Reo create_session failed (${res.status}): ${text}`)
    }

    const session = (await res.json()) as { websocket_url: string }

    // Connect WebSocket
    await new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(session.websocket_url)

      this.ws.on('open', () => resolve())
      this.ws.on('error', (err) => {
        this.options.onError?.(`Papa Reo WS error: ${err.message}`, true)
        reject(err)
      })

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          this.handleMessage(msg)
        } catch {
          // Ignore non-JSON messages
        }
      })

      this.ws.on('close', () => {
        this.ws = null
      })
    })
  }

  private handleMessage(msg: { text?: string; is_final?: boolean }): void {
    if (!msg.text) return

    const isFinal = msg.is_final === true
    const seq = isFinal ? ++this.sequence : this.sequence + 1

    const payload: CaptionSegmentPayload = {
      id: uuidv4(),
      segments: { 'mi-NZ': msg.text },
      isFinal,
      sequence: seq,
    }

    this.options.onSegment(payload)

    // Persist final segments
    if (isFinal && this.eventId) {
      const row = {
        id: uuidv4(),
        event_id: this.eventId,
        sequence: seq,
        text: msg.text,
        language: 'mi-NZ',
        is_final: true,
      }
      supabase
        .from('caption_segments')
        .insert([row])
        .then(({ error }) => {
          if (error) console.error('Failed to persist Papa Reo segment:', error.message)
        })
    }
  }

  pushChunk(chunk: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk)
    }
  }

  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

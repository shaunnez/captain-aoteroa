import { WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'
import type { SequenceCounter } from './AzureSession'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface OpenAiSttSessionOptions {
  apiKey: string
  eventCode: string
  onSegment: (payload: CaptionSegmentPayload) => void
  onError?: (message: string, fatal: boolean) => void
  sharedSequence?: SequenceCounter
}

const REALTIME_URL = 'wss://api.openai.com/v1/realtime?intent=transcription'
const IN_SAMPLE_RATE = 16000   // audio capture rate
const OUT_SAMPLE_RATE = 24000  // OpenAI Realtime requirement

/** Linear resample from 16kHz Int16 PCM to 24kHz Int16 PCM. */
function resample16to24(input: Buffer): Buffer {
  const src = new Int16Array(input.buffer, input.byteOffset, input.byteLength / 2)
  const outLen = Math.floor(src.length * OUT_SAMPLE_RATE / IN_SAMPLE_RATE)
  const dst = new Int16Array(outLen)

  for (let i = 0; i < outLen; i++) {
    const srcPos = i * IN_SAMPLE_RATE / OUT_SAMPLE_RATE
    const srcIdx = Math.floor(srcPos)
    const frac = srcPos - srcIdx
    const a = src[srcIdx] ?? 0
    const b = src[srcIdx + 1] ?? a
    dst[i] = Math.round(a + frac * (b - a))
  }

  return Buffer.from(dst.buffer)
}

export class OpenAiSttSession {
  private options: OpenAiSttSessionOptions
  private ws: WebSocket | null = null
  private ownSequence = 0
  private eventId: string | null = null
  // Track the last partial text per item so we can emit incremental updates
  private currentItemId: string | null = null
  private currentPartial = ''

  constructor(options: OpenAiSttSessionOptions) {
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

    await new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(REALTIME_URL, {
        headers: {
          'Authorization': `Bearer ${this.options.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      })

      this.ws.on('open', () => {
        // Configure a transcription-only session for te reo Māori
        this.ws!.send(JSON.stringify({
          type: 'transcription_session.update',
          session: {
            input_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'gpt-4o-transcribe',
              language: 'mi',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            input_audio_noise_reduction: {
              type: 'near_field',
            },
          },
        }))
        resolve()
      })

      this.ws.on('error', (err) => {
        this.options.onError?.(`OpenAI STT WS error: ${err.message}`, true)
        reject(err)
      })

      this.ws.on('message', (raw) => {
        try {
          this.handleMessage(JSON.parse(raw.toString()))
        } catch {
          // ignore non-JSON
        }
      })

      this.ws.on('close', () => {
        this.ws = null
      })
    })
  }

  private handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'conversation.item.input_audio_transcription.delta': {
        // Partial transcript
        const itemId = msg.item_id as string
        const delta = (msg.delta as string | undefined) ?? ''

        if (itemId !== this.currentItemId) {
          this.currentItemId = itemId
          this.currentPartial = ''
        }
        this.currentPartial += delta

        if (!this.currentPartial) return
        const seq = this.sequence + 1
        this.options.onSegment({
          id: uuidv4(),
          segments: { 'mi': this.currentPartial },
          isFinal: false,
          sequence: seq,
        })
        break
      }

      case 'conversation.item.input_audio_transcription.completed': {
        // Final transcript for a turn
        const text = (msg.transcript as string | undefined)?.trim()
        if (!text) return

        const seq = ++this.sequence
        this.currentPartial = ''
        this.currentItemId = null

        const payload: CaptionSegmentPayload = {
          id: uuidv4(),
          segments: { 'mi': text },
          isFinal: true,
          sequence: seq,
        }
        this.options.onSegment(payload)

        if (this.eventId) {
          supabase
            .from('caption_segments')
            .upsert([{
              id: uuidv4(),
              event_id: this.eventId,
              sequence: seq,
              text,
              language: 'mi',
              is_final: true,
              segments: { 'mi': text },
            }], { onConflict: 'event_id,sequence' })
            .then(({ error }) => {
              if (error) console.error('[OpenAiStt] Failed to persist segment:', error.message)
            })
        }
        break
      }

      case 'error': {
        const errMsg = (msg.error as Record<string, unknown>)?.message ?? 'Unknown error'
        console.error('[OpenAiStt] API error:', errMsg)
        this.options.onError?.(`OpenAI STT error: ${errMsg}`, false)
        break
      }
    }
  }

  pushChunk(chunk: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const resampled = resample16to24(chunk)
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: resampled.toString('base64'),
    }))
  }

  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

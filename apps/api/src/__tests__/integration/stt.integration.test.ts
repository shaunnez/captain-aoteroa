import * as fs from 'fs'
import * as path from 'path'
import { describe, it, expect, vi } from 'vitest'
import { stripWavHeader, fuzzyMatch, collectSegment } from './helpers'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

const FIXTURES = path.join(__dirname, '../fixtures/audio')

const skipAzure = process.env.AZURE_SPEECH_KEY === '__placeholder__'
const skipOpenAI = process.env.OPENAI_API_KEY === '__placeholder__'

// Prevent real DB writes — sessions call supabase to fetch event_id and insert segments
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null }) }), order: () => ({ limit: () => ({ single: async () => ({ data: null }) }) }) }),
      insert: vi.fn().mockResolvedValue({}),
    }),
  },
}))

describe('STT layer', () => {
  it.skipIf(skipAzure)('en-NZ STT: recognizes English phrase from fixture WAV', async () => {
    const { AzureSession } = await import('../../services/AzureSession')

    const wav = fs.readFileSync(path.join(FIXTURES, 'en-hello.wav'))
    const pcm = stripWavHeader(wav)

    let segmentCallback: ((p: CaptionSegmentPayload) => void) | null = null

    const session = new AzureSession({
      eventCode: 'test-stt-en',
      speakerLocale: 'en-NZ',
      languages: [],
      onSegment: (p) => segmentCallback?.(p),
      onError: (msg) => console.error('[AzureSession error]', msg),
    })

    const text = await collectSegment(
      session,
      pcm,
      (cb) => { segmentCallback = cb },
    )

    console.log('[en-NZ STT] recognized:', JSON.stringify(text))
    expect(text.length).toBeGreaterThan(0)
    expect(fuzzyMatch(text, 'Hello welcome to the event', 0.2)).toBe(true)

    await session.stop()
  })

  it.skipIf(skipOpenAI)('mi-NZ STT: recognizes te reo phrase from fixture WAV', async () => {
    const { OpenAiSttSession } = await import('../../services/OpenAiSttSession')

    const wav = fs.readFileSync(path.join(FIXTURES, 'mi-kia-ora.wav'))
    const pcm = stripWavHeader(wav)

    let segmentCallback: ((p: CaptionSegmentPayload) => void) | null = null

    const session = new OpenAiSttSession({
      apiKey: process.env.OPENAI_API_KEY!,
      eventCode: 'test-stt-mi',
      onSegment: (p) => segmentCallback?.(p),
      onError: (msg) => console.error('[OpenAiSttSession error]', msg),
    })

    const text = await collectSegment(
      session,
      pcm,
      (cb) => { segmentCallback = cb },
    )

    console.log('[mi-NZ STT] recognized:', JSON.stringify(text))
    expect(text.length).toBeGreaterThan(0)
    // te reo threshold is more generous — models vary on macron handling
    expect(fuzzyMatch(text, 'Kia ora nau mai ki tenei hui', 0.3)).toBe(true)

    await session.stop()
  })
})

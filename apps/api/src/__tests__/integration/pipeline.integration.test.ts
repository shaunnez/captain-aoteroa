import * as fs from 'fs'
import * as path from 'path'
import { describe, it, expect, vi } from 'vitest'
import { stripWavHeader, fuzzyMatch, collectSegment, isValidMp3, isValidPcmStream } from './helpers'
import { translateText } from '../../services/translateText'
import { TtsService } from '../../services/TtsService'
import { OpenAiTtsService } from '../../services/OpenAiTtsService'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

const FIXTURES = path.join(__dirname, '../fixtures/audio')

const skipAzure = process.env.AZURE_SPEECH_KEY === '__placeholder__'
const skipOpenAI = process.env.OPENAI_API_KEY === '__placeholder__'
const skipAll = skipAzure || skipOpenAI

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null }) }), order: () => ({ limit: () => ({ single: async () => ({ data: null }) }) }) }),
      insert: vi.fn().mockResolvedValue({}),
    }),
  },
}))

const tts = new TtsService({ speechKey: process.env.AZURE_SPEECH_KEY!, speechRegion: process.env.AZURE_SPEECH_REGION! })
const openAiTts = skipOpenAI ? null : new OpenAiTtsService({ apiKey: process.env.OPENAI_API_KEY! })

interface PipelineResult {
  recognizedText: string
  translatedText: string | null
  audio: Buffer | null
  audioChunks: Buffer[]
}

async function runPipeline(opts: {
  wavFile: string
  sourceLocale: string
  targetLang: string
}): Promise<PipelineResult> {
  const wav = fs.readFileSync(path.join(FIXTURES, opts.wavFile))
  const pcm = stripWavHeader(wav)
  const sourceShort = opts.sourceLocale.split('-')[0]

  // 1. STT
  let segmentCallback: ((p: CaptionSegmentPayload) => void) | null = null
  let session: { start(): Promise<void>; pushChunk(b: Buffer): void; stop(): Promise<void> }

  if (opts.sourceLocale === 'mi-NZ') {
    const { OpenAiSttSession } = await import('../../services/OpenAiSttSession')
    session = new OpenAiSttSession({
      apiKey: process.env.OPENAI_API_KEY!,
      eventCode: `test-pipeline-${opts.sourceLocale}-${opts.targetLang}`,
      onSegment: (p) => segmentCallback?.(p),
      onError: (msg) => console.error('[STT error]', msg),
    })
  } else {
    const { AzureSession } = await import('../../services/AzureSession')
    session = new AzureSession({
      eventCode: `test-pipeline-${opts.sourceLocale}-${opts.targetLang}`,
      speakerLocale: opts.sourceLocale,
      onSegment: (p) => segmentCallback?.(p),
      onError: (msg) => console.error('[STT error]', msg),
    })
  }

  const recognizedText = await collectSegment(session, pcm, (cb) => { segmentCallback = cb })
  await session.stop()
  console.log(`[pipeline ${opts.sourceLocale}→${opts.targetLang}] recognized:`, JSON.stringify(recognizedText))

  // 2. Translate (skip if source lang === target lang)
  let textForTts = recognizedText
  let translatedText: string | null = null
  if (sourceShort !== opts.targetLang) {
    const translations = await translateText(recognizedText, sourceShort, [opts.targetLang])
    translatedText = translations[opts.targetLang] ?? null
    console.log(`[pipeline ${opts.sourceLocale}→${opts.targetLang}] translated:`, JSON.stringify(translatedText))
    expect(translatedText).toBeTruthy()
    textForTts = translatedText!
  }

  // 3. TTS
  if (opts.targetLang === 'mi' && openAiTts) {
    const audioChunks: Buffer[] = []
    await openAiTts.synthesizeStream(textForTts, (chunk) => audioChunks.push(chunk))
    return { recognizedText, translatedText, audio: null, audioChunks }
  } else {
    const audio = await tts.synthesize(textForTts, opts.targetLang)
    return { recognizedText, translatedText, audio, audioChunks: [] }
  }
}

describe.skipIf(skipAll)('pipeline', () => {
  it('pipeline en→en', async () => {
    const result = await runPipeline({ wavFile: 'en-hello.wav', sourceLocale: 'en-NZ', targetLang: 'en' })
    expect(fuzzyMatch(result.recognizedText, 'Hello welcome to the event', 0.2)).toBe(true)
    expect(result.translatedText).toBeNull()
    expect(isValidMp3(result.audio!)).toBe(true)
  })

  it('pipeline en→mi', async () => {
    const result = await runPipeline({ wavFile: 'en-hello.wav', sourceLocale: 'en-NZ', targetLang: 'mi' })
    expect(fuzzyMatch(result.recognizedText, 'Hello welcome to the event', 0.2)).toBe(true)
    expect(result.translatedText).toBeTruthy()
    expect(isValidPcmStream(result.audioChunks)).toBe(true)
  })

  it('pipeline en→fr', async () => {
    const result = await runPipeline({ wavFile: 'en-hello.wav', sourceLocale: 'en-NZ', targetLang: 'fr' })
    expect(fuzzyMatch(result.recognizedText, 'Hello welcome to the event', 0.2)).toBe(true)
    expect(result.translatedText).toBeTruthy()
    expect(isValidMp3(result.audio!)).toBe(true)
  })

  it('pipeline mi→mi', async () => {
    const result = await runPipeline({ wavFile: 'mi-kia-ora.wav', sourceLocale: 'mi-NZ', targetLang: 'mi' })
    expect(result.recognizedText.length).toBeGreaterThan(0)
    expect(result.translatedText).toBeNull()
    expect(isValidPcmStream(result.audioChunks)).toBe(true)
  })

  it('pipeline mi→en', async () => {
    const result = await runPipeline({ wavFile: 'mi-kia-ora.wav', sourceLocale: 'mi-NZ', targetLang: 'en' })
    expect(result.recognizedText.length).toBeGreaterThan(0)
    expect(result.translatedText).toBeTruthy()
    expect(isValidMp3(result.audio!)).toBe(true)
  })

  it('pipeline mi→fr', async () => {
    const result = await runPipeline({ wavFile: 'mi-kia-ora.wav', sourceLocale: 'mi-NZ', targetLang: 'fr' })
    expect(result.recognizedText.length).toBeGreaterThan(0)
    expect(result.translatedText).toBeTruthy()
    expect(isValidMp3(result.audio!)).toBe(true)
  })
})

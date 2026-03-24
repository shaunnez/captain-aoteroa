import OpenAI from 'openai'

interface OpenAiTtsOptions {
  apiKey: string
}

export class OpenAiTtsService {
  private client: OpenAI

  constructor(options: OpenAiTtsOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey })
  }

  /**
   * Stream synthesised te reo Māori speech from OpenAI TTS.
   * Calls `onChunk` for each PCM chunk as it arrives (24kHz 16-bit LE mono).
   * Rejects on API error.
   */
  async synthesizeStream(text: string, onChunk: (chunk: Buffer) => void): Promise<void> {
    const start = Date.now()

    const response = await this.client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      input: text,
      response_format: 'pcm',
      instructions:
        'You are reading te reo Māori text aloud for a New Zealand audience. Pronounce all words with correct vowel length and macrons. Speak clearly at a measured pace.',
    })

    // The OpenAI SDK wraps the HTTP response — get the raw Node stream
    const stream = response.body as unknown as NodeJS.ReadableStream

    for await (const chunk of stream) {
      onChunk(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as unknown as ArrayBuffer))
    }

    console.log(`[OpenAiTts] synthesized ${text.length} chars in ${Date.now() - start}ms`)
  }
}

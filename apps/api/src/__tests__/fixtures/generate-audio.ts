/**
 * One-time script to generate WAV fixtures used by speech-to-speech integration tests.
 *
 * Usage:
 *   pnpm --filter api generate-audio           # skip existing files
 *   pnpm --filter api generate-audio --force   # overwrite existing files
 *
 * Requires OPENAI_API_KEY in environment (or apps/api/.env).
 *
 * Output format: 16 kHz, 16-bit, mono, PCM WAV — the exact format AzureSession expects.
 * OpenAI TTS returns 24 kHz PCM WAV; this script downsamples to 16 kHz.
 */

import * as fs from 'fs'
import * as path from 'path'
import OpenAI from 'openai'
import 'dotenv/config'

const FIXTURES_DIR = path.join(__dirname, 'audio')

const PHRASES: Array<{ filename: string; text: string; voice: OpenAI.Audio.Speech.SpeechCreateParams['voice'] }> = [
  {
    filename: 'en-hello.wav',
    text: 'Hello, welcome to the event.',
    voice: 'alloy',
  },
  {
    filename: 'mi-kia-ora.wav',
    text: 'Kia ora, nau mai ki tēnei hui.',
    voice: 'coral', // same voice used by OpenAiTtsService for te reo
  },
]

const TARGET_SAMPLE_RATE = 16000

/** Parse sample rate from a WAV header buffer. */
function wavSampleRate(buf: Buffer): number {
  // Bytes 24-27: sample rate (little-endian uint32)
  return buf.readUInt32LE(24)
}

/** Downsample a 16-bit LE mono PCM buffer from srcRate to dstRate using linear interpolation. */
function downsample(pcm: Buffer, srcRate: number, dstRate: number): Buffer {
  if (srcRate === dstRate) return pcm
  const ratio = srcRate / dstRate
  const srcSamples = pcm.length / 2 // 16-bit = 2 bytes per sample
  const dstSamples = Math.floor(srcSamples / ratio)
  const out = Buffer.allocUnsafe(dstSamples * 2)
  for (let i = 0; i < dstSamples; i++) {
    const srcPos = i * ratio
    const lo = Math.floor(srcPos)
    const hi = Math.min(lo + 1, srcSamples - 1)
    const frac = srcPos - lo
    const sampleLo = pcm.readInt16LE(lo * 2)
    const sampleHi = pcm.readInt16LE(hi * 2)
    const sample = Math.round(sampleLo + frac * (sampleHi - sampleLo))
    out.writeInt16LE(sample, i * 2)
  }
  return out
}

/** Build a standard 44-byte WAV header for 16-bit mono PCM. */
function wavHeader(sampleRate: number, numSamples: number): Buffer {
  const byteRate = sampleRate * 2 // 16-bit mono = 2 bytes/sample
  const dataSize = numSamples * 2
  const buf = Buffer.allocUnsafe(44)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(36 + dataSize, 4)   // ChunkSize
  buf.write('WAVE', 8, 'ascii')
  buf.write('fmt ', 12, 'ascii')
  buf.writeUInt32LE(16, 16)             // Subchunk1Size (PCM)
  buf.writeUInt16LE(1, 20)              // AudioFormat (1 = PCM)
  buf.writeUInt16LE(1, 22)              // NumChannels (mono)
  buf.writeUInt32LE(sampleRate, 24)     // SampleRate
  buf.writeUInt32LE(byteRate, 28)       // ByteRate
  buf.writeUInt16LE(2, 32)              // BlockAlign
  buf.writeUInt16LE(16, 34)             // BitsPerSample
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(dataSize, 40)       // Subchunk2Size
  return buf
}

async function generate() {
  const force = process.argv.includes('--force')
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('ERROR: OPENAI_API_KEY is not set')
    process.exit(1)
  }

  const client = new OpenAI({ apiKey })

  for (const phrase of PHRASES) {
    const outPath = path.join(FIXTURES_DIR, phrase.filename)

    if (!force && fs.existsSync(outPath)) {
      console.log(`SKIP  ${phrase.filename} (already exists; use --force to overwrite)`)
      continue
    }

    console.log(`GEN   ${phrase.filename} — "${phrase.text}"`)

    // OpenAI returns WAV at 24 kHz by default when format is 'wav' via pcm
    // Use response_format: 'pcm' to get raw 24kHz 16-bit LE mono, then build WAV ourselves
    const response = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: phrase.voice,
      input: phrase.text,
      response_format: 'pcm', // raw 24 kHz 16-bit LE mono
    })

    const pcm24 = Buffer.from(await response.arrayBuffer())
    const srcRate = 24000 // OpenAI PCM is always 24 kHz
    console.log(`      source: ${pcm24.length} bytes @ ${srcRate} Hz`)

    const pcm16 = downsample(pcm24, srcRate, TARGET_SAMPLE_RATE)
    const numSamples = pcm16.length / 2
    const header = wavHeader(TARGET_SAMPLE_RATE, numSamples)
    const wav = Buffer.concat([header, pcm16])

    fs.writeFileSync(outPath, wav)

    // Verify
    const written = fs.readFileSync(outPath)
    const magic = written.slice(0, 4).toString('ascii')
    const sr = wavSampleRate(written)
    console.log(`      written: ${written.length} bytes, magic=${magic}, sampleRate=${sr} Hz`)
    if (magic !== 'RIFF' || sr !== TARGET_SAMPLE_RATE) {
      console.error(`ERROR: Fixture ${phrase.filename} failed format check`)
      process.exit(1)
    }
    console.log(`OK    ${phrase.filename}`)
  }

  console.log('\nAll fixtures ready.')
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})

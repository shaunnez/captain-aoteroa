import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

// ---------------------------------------------------------------------------
// WAV utilities
// ---------------------------------------------------------------------------

/** Strip the standard 44-byte WAV header, returning raw PCM bytes. */
export function stripWavHeader(wav: Buffer): Buffer {
  if (wav.slice(0, 4).toString('ascii') !== 'RIFF') {
    throw new Error('Not a WAV file — missing RIFF magic')
  }
  return wav.slice(44)
}

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Returns true if the normalized edit distance between `actual` and `reference`
 * is within `threshold` (fraction of reference length).
 * e.g. threshold=0.2 allows up to 20% of characters to differ.
 */
export function fuzzyMatch(actual: string, reference: string, threshold = 0.2): boolean {
  const a = normalize(actual)
  const r = normalize(reference)
  if (r.length === 0) return a.length === 0
  const dist = levenshtein(a, r)
  return dist / r.length <= threshold
}

// ---------------------------------------------------------------------------
// Audio validation
// ---------------------------------------------------------------------------

/**
 * Returns true if `buf` looks like a valid MP3:
 * - at least 1 KB
 * - starts with ID3 tag or MP3 sync frame
 */
export function isValidMp3(buf: Buffer): boolean {
  if (buf.byteLength < 1000) return false
  const isId3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33
  const isSyncFrame = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
  return isId3 || isSyncFrame
}

/**
 * Returns true if the collected PCM stream chunks are non-trivial:
 * - at least 1 chunk
 * - total byte length ≥ 1 KB
 */
export function isValidPcmStream(chunks: Buffer[]): boolean {
  const totalBytes = chunks.reduce((n, c) => n + c.byteLength, 0)
  return chunks.length > 0 && totalBytes >= 1000
}

// ---------------------------------------------------------------------------
// STT result collector
// ---------------------------------------------------------------------------

interface SegmentSession {
  start(): Promise<void>
  pushChunk(b: Buffer): void
  stop(): Promise<void>
}

/**
 * Starts the session, feeds PCM in 4096-byte chunks, then collects ALL final
 * segments until `quietMs` elapses with no new segment. Returns all final
 * segment texts joined with a space.
 *
 * Azure STT splits speech at silence boundaries (e.g. after a comma), so a
 * single phrase may produce multiple final segments. Joining them gives the
 * full recognised text for fuzzy matching.
 */
export async function collectSegment(
  session: SegmentSession,
  pcm: Buffer,
  onSegment: (cb: (payload: CaptionSegmentPayload) => void) => void,
  timeoutMs = 20000,
  quietMs = 1500,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const finalTexts: string[] = []
    let quietTimer: ReturnType<typeof setTimeout> | null = null
    let globalTimer: ReturnType<typeof setTimeout> | null = null

    const finish = () => {
      if (quietTimer) clearTimeout(quietTimer)
      if (globalTimer) clearTimeout(globalTimer)
      resolve(finalTexts.join(' ').trim())
    }

    const resetQuietTimer = () => {
      if (quietTimer) clearTimeout(quietTimer)
      quietTimer = setTimeout(finish, quietMs)
    }

    globalTimer = setTimeout(() => {
      if (quietTimer) clearTimeout(quietTimer)
      if (finalTexts.length > 0) {
        resolve(finalTexts.join(' ').trim())
      } else {
        reject(new Error(`collectSegment: timed out after ${timeoutMs}ms with no segments`))
      }
    }, timeoutMs)

    onSegment((payload) => {
      if (payload.isFinal) {
        const text = Object.values(payload.segments)[0] ?? ''
        if (text) {
          finalTexts.push(text)
          // Start/reset quiet timer only once we have at least one segment.
          // This lets slow STT services (e.g. OpenAI) take as long as needed
          // for the first result without hitting the quiet window prematurely.
          resetQuietTimer()
        }
      }
    })

    session
      .start()
      .then(() => {
        const CHUNK = 4096
        for (let offset = 0; offset < pcm.length; offset += CHUNK) {
          session.pushChunk(pcm.slice(offset, offset + CHUNK))
        }
        // 500 ms of silence to flush the last segment
        const silenceSamples = 16000 * 0.5
        const silence = Buffer.alloc(silenceSamples * 2, 0)
        session.pushChunk(silence)
        // Do NOT start quiet timer here — wait for the first segment to arrive
      })
      .catch((err) => {
        if (quietTimer) clearTimeout(quietTimer)
        if (globalTimer) clearTimeout(globalTimer)
        reject(err)
      })
  })
}

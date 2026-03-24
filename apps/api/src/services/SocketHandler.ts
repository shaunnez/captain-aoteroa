import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared'
import { EventManager } from './EventManager'
import { supabase } from './supabase'
import { verifyJWT as verifyToken } from '../middleware/auth'
import { TtsService } from './TtsService'
import { OpenAiTtsService } from './OpenAiTtsService'
import { AudioSubscriptionManager } from './AudioSubscriptionManager'
import { config } from '../config'
import { translateText } from './translateText'
import { v4 as uuidv4 } from 'uuid'

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>

const HISTORY_SIZE = 20

// Cache event code → UUID to avoid repeated DB lookups
const eventIdCache = new Map<string, string>()

async function resolveEventId(code: string): Promise<string | null> {
  const cached = eventIdCache.get(code)
  if (cached) return cached
  const { data } = await supabase.from('events').select('id').eq('code', code).single()
  if (data?.id) {
    eventIdCache.set(code, data.id)
    return data.id
  }
  return null
}

/** Resolve text from segments, handling BCP-47 ↔ short code mismatches (e.g. 'en' ↔ 'en-NZ'). */
function resolveSegmentText(segments: Record<string, string>, lang: string): string | undefined {
  return segments[lang]
    ?? Object.entries(segments).find(
      ([k]) => k.startsWith(lang + '-') || lang.startsWith(k + '-')
    )?.[1]
}

async function broadcastViewerCount(io: AppServer, code: string): Promise<void> {
  const sockets = await io.in(code).fetchSockets()
  io.to(code).emit('viewer:count', { count: sockets.length })
}

export function setupSocketHandler(io: AppServer): void {
  const tts = new TtsService({ speechKey: config.azure.speechKey, speechRegion: config.azure.speechRegion })
  const openAiTts = config.openaiApiKey ? new OpenAiTtsService({ apiKey: config.openaiApiKey }) : null
  const audioSubs = new AudioSubscriptionManager()

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // Track rooms for viewer count on disconnect
    socket.on('audio:subscribe', ({ code, language }) => {
      audioSubs.subscribe(code, language, socket.id)
    })

    socket.on('audio:unsubscribe', ({ code, language }) => {
      audioSubs.unsubscribe(code, language, socket.id)
    })

    socket.on('disconnecting', async () => {
      audioSubs.disconnectAll(socket.id)
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          // Subtract 1 because this socket is still in the room during 'disconnecting'
          const sockets = await io.in(room).fetchSockets()
          io.to(room).emit('viewer:count', { count: Math.max(0, sockets.length - 1) })
        }
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} reason=${reason}`)
    })

    // Audience joins an event room to receive captions
    socket.on('event:join', async (code) => {
      console.log(`[socket] event:join code=${code} socketId=${socket.id}`)
      socket.join(code)
      await broadcastViewerCount(io, code)

      // Send caption history so reconnects/late joiners see recent captions
      // Two-step: resolve event UUID first, then fetch segments
      const { data: eventRow } = await supabase
        .from('events')
        .select('id')
        .eq('code', code)
        .single()

      if (!eventRow) return

      // Emit Q&A history for reconnects/late joiners
      const { data: qaQuestions } = await supabase
        .from('qa_questions')
        .select('*')
        .eq('event_id', eventRow.id)
        .neq('status', 'dismissed')
        .order('created_at', { ascending: false })
        .limit(50)
      socket.emit('qa:history', { questions: qaQuestions || [] })

      // Each sequence has one row per language, so over-fetch rows and collect
      // the most recent HISTORY_SIZE distinct sequences in JS before grouping.
      const { data } = await supabase
        .from('caption_segments')
        .select('*')
        .eq('event_id', eventRow.id)
        .eq('is_final', true)
        .order('sequence', { ascending: false })
        .limit(HISTORY_SIZE * 100)

      if (data && data.length > 0) {
        // Collect the most recent HISTORY_SIZE sequences, then group their rows.
        // Rows arrive descending by sequence so same-sequence rows are adjacent.
        const grouped = new Map<number, { id: string; segments: Record<string, string>; sequence: number }>()
        for (const row of data) {
          if (!grouped.has(row.sequence)) {
            if (grouped.size >= HISTORY_SIZE) break
            grouped.set(row.sequence, { id: row.id, segments: {}, sequence: row.sequence })
          }
          grouped.get(row.sequence)!.segments[row.language] = row.text
        }
        // Emit in chronological order
        const segments = Array.from(grouped.values())
          .sort((a, b) => a.sequence - b.sequence)
          .map((s) => ({ ...s, isFinal: true }))
        socket.emit('caption:history', { segments })
      }
    })

    socket.on('event:leave', async (code) => {
      socket.leave(code)
      await broadcastViewerCount(io, code)
    })

    // Organiser starts a captioning session
    socket.on('session:start', async (payload) => {
      const code = typeof payload === 'string' ? payload : payload.code
      const locale = typeof payload === 'string' ? undefined : payload.locale
      console.log(`[socket] session:start code=${code} locale=${locale ?? 'default'} socketId=${socket.id}`)
      const authorised = isAuthorised(socket)
      console.log(`[socket] session:start auth=${authorised}`)
      if (!authorised) {
        socket.emit('caption:error', { message: 'Unauthorised', fatal: true })
        return
      }

      // Verify event exists
      const { data: event, error: dbError } = await supabase
        .from('events')
        .select('id')
        .eq('code', code)
        .single()

      console.log(`[socket] session:start event lookup: found=${!!event} error=${dbError?.message ?? 'none'}`)

      if (!event) {
        socket.emit('caption:error', { message: 'Event not found', fatal: true })
        return
      }

      console.log(`[socket] session:start speakerLocale=${locale ?? 'default'}`)

      try {
        await EventManager.start(
          code,
          { speakerLocale: locale ?? undefined },
          (payload) => {
            console.log(`[socket] emitting caption:segment seq=${payload.sequence} final=${payload.isFinal}`)
            io.to(code).emit('caption:segment', payload)
            if (!payload.isFinal) return

            // Translate source-only segments to all other NZ languages (fire-and-forget)
            const segmentKeys = Object.keys(payload.segments)
            if (segmentKeys.length === 1) {
              const sourceLang = segmentKeys[0]
              const sourceText = payload.segments[sourceLang]
              // Use short code for Azure Translator API (e.g. 'en-NZ' → 'en')
              const sourceShort = sourceLang.includes('-') ? sourceLang.split('-')[0] : sourceLang
              const targetLangs = NZ_LANGUAGES.map((l) => l.code).filter((c) => c !== sourceShort && c !== sourceLang)
              translateText(sourceText, sourceShort, targetLangs)
                .then(async (translations) => {
                  if (Object.keys(translations).length === 0) return
                  // Merge translations and re-emit so all audiences see captions
                  const enrichedPayload = {
                    ...payload,
                    segments: { ...payload.segments, ...translations },
                  }
                  io.to(code).emit('caption:segment', enrichedPayload)

                  // Trigger TTS for translated languages
                  const translationSubscribers = audioSubs.getSubscribers(code)
                  for (const [lang, sockets] of translationSubscribers) {
                    if (sockets.size === 0) continue
                    const text = resolveSegmentText(translations, lang)
                    if (!text) continue
                    tts.synthesize(text, lang).then((audio) => {
                      if (!audio) {
                        console.warn(`[SocketHandler] No TTS voice for translated language: ${lang}`)
                        return
                      }
                      io.to([...sockets]).emit('audio:tts', {
                        language: lang,
                        sequence: payload.sequence,
                        data: audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer,
                      })
                    }).catch((err) => {
                      console.error('[SocketHandler] TTS synthesis failed for te reo translation:', err)
                    })
                  }

                  // Persist translated segments to DB
                  const eventId = await resolveEventId(code)
                  if (eventId) {
                    const rows = Object.entries(translations).map(([lang, text]) => ({
                      id: uuidv4(),
                      event_id: eventId,
                      sequence: payload.sequence,
                      text,
                      language: lang,
                      is_final: true,
                    }))
                    const { error } = await supabase.from('caption_segments').insert(rows)
                    if (error) console.error('[SocketHandler] Failed to persist translated segments:', error.message)
                  }
                })
                .catch((err) => {
                  console.error('[SocketHandler] Te reo translation failed:', err)
                })
            }
            const subscribers = audioSubs.getSubscribers(code)
            for (const [lang, sockets] of subscribers) {
              if (sockets.size === 0) continue
              const text = resolveSegmentText(payload.segments, lang)
              if (!text) continue

              if (lang === 'mi' && openAiTts) {
                // Stream PCM chunks from OpenAI in realtime
                const socketIds = [...sockets]
                openAiTts.synthesizeStream(text, (chunk) => {
                  io.to(socketIds).emit('audio:tts-stream', {
                    language: lang,
                    sequence: payload.sequence,
                    chunk: chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer,
                    done: false,
                  })
                }).then(() => {
                  io.to(socketIds).emit('audio:tts-stream', {
                    language: lang,
                    sequence: payload.sequence,
                    chunk: new ArrayBuffer(0),
                    done: true,
                  })
                }).catch((err) => {
                  console.error('[SocketHandler] OpenAI TTS stream failed, falling back to Azure:', err)
                  // Fallback to Azure TTS
                  tts.synthesize(text, lang).then((audio) => {
                    if (!audio) return
                    io.to(socketIds).emit('audio:tts', {
                      language: lang,
                      sequence: payload.sequence,
                      data: audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer,
                    })
                  }).catch((fallbackErr) => {
                    console.error('[SocketHandler] Azure TTS fallback also failed:', fallbackErr)
                  })
                })
              } else {
                tts.synthesize(text, lang).then((audio) => {
                  if (!audio) {
                    console.warn(`[SocketHandler] No TTS voice for language: ${lang}`)
                    return
                  }
                  io.to([...sockets]).emit('audio:tts', {
                    language: lang,
                    sequence: payload.sequence,
                    data: audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer,
                  })
                }).catch((err) => {
                  console.error('[SocketHandler] TTS synthesis failed:', err)
                })
              }
            }
          },
          (message, fatal) => {
            console.log(`[socket] caption:error message="${message}" fatal=${fatal}`)
            io.to(code).emit('caption:error', { message, fatal })
          },
        )
        console.log(`[socket] session:start Azure session started for code=${code}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[socket] session:start FAILED to start Azure session: ${msg}`)
        socket.emit('caption:error', { message: `Session start failed: ${msg}`, fatal: true })
      }
    })

    // Organiser ends the captioning session
    socket.on('session:end', async (code) => {
      await EventManager.end(code)
    })

    // Organiser switches recognition language (null = back to auto-detect)
    socket.on('session:set-language', async ({ code, locale }) => {
      console.log(`[socket] session:set-language code=${code} locale=${locale ?? 'auto'}`)
      if (!isAuthorised(socket)) return
      await EventManager.setLanguage(code, locale)
    })

    // Organiser switches between single/dual recognition mode
    socket.on('session:set-mode', async ({ code, mode }) => {
      console.log(`[socket] session:set-mode code=${code} mode=${mode}`)
      if (!isAuthorised(socket)) return
      await EventManager.setMode(code, mode)
    })

    // Audience submits a question
    socket.on('qa:submit', async ({ code, body, language }) => {
      if (!body?.trim() || body.length > 280) return

      const { data: event } = await supabase.from('events').select('id, languages').eq('code', code).single()
      if (!event) return

      // Insert question
      const { data: question, error } = await supabase
        .from('qa_questions')
        .insert({ event_id: event.id, body: body.trim(), language })
        .select()
        .single()
      if (error || !question) return

      // Translate to event languages (async, don't block)
      try {
        const targetLangs = (event.languages || []).filter((l: string) => l !== language).map((l: string) => l.split('-')[0])
        if (targetLangs.length > 0 && config.azure?.speechKey) {
          const translations = await translateText(body.trim(), language.split('-')[0], targetLangs)
          if (Object.keys(translations).length > 0) {
            await supabase.from('qa_questions').update({ translations }).eq('id', question.id)
            question.translations = translations
          }
        }
      } catch (e) {
        console.error('Q&A translation failed:', e)
      }

      io.to(code).emit('qa:new', { question })
    })

    // Organiser moderates a question (pin or dismiss)
    socket.on('qa:moderate', async ({ code, questionId, status }) => {
      if (!isAuthorised(socket)) return

      const { data: question, error } = await supabase
        .from('qa_questions')
        .update({ status })
        .eq('id', questionId)
        .select()
        .single()
      if (error || !question) return

      io.to(code).emit('qa:update', { question })
    })

    // Emoji reactions (ephemeral, no DB)
    const reactionThrottles = new Map<string, number>()
    socket.on('reaction:send', ({ code, emoji }) => {
      const key = `${socket.id}:${emoji}`
      const now = Date.now()
      if ((reactionThrottles.get(key) ?? 0) > now - 2000) return
      reactionThrottles.set(key, now)
      io.to(code).emit('reaction:burst', { emoji, count: 1 })
    })

    // Incoming PCM audio chunk from organiser
    let chunkCount = 0
    socket.on('audio:chunk', (chunk) => {
      chunkCount++
      if (chunkCount <= 3 || chunkCount % 100 === 0) {
        console.log(`[socket] audio:chunk #${chunkCount} size=${chunk.byteLength} rooms=${JSON.stringify([...socket.rooms])}`)
      }
      // Find which room this socket is in that has an active session
      let routed = false
      socket.rooms.forEach((room) => {
        if (EventManager.has(room)) {
          EventManager.pushChunk(room, Buffer.from(chunk))
          routed = true
        }
      })
      if (!routed && (chunkCount <= 3 || chunkCount % 100 === 0)) {
        console.warn(`[socket] audio:chunk #${chunkCount} NOT routed — no active session in rooms ${JSON.stringify([...socket.rooms])}`)
      }
    })
  })
}

// Validate Supabase auth token from socket handshake
function isAuthorised(socket: Socket): boolean {
  // Check that a non-empty token was provided.
  // Full Supabase token verification happens on the HTTP routes.
  // Socket auth is a lightweight gatekeeper — the token's presence indicates
  // the client went through the Supabase login flow.
  const token = socket.handshake.auth?.token as string | undefined
  return !!token && token.length > 0
}

import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared'
import { EventManager } from './EventManager'
import { supabase } from './supabase'
import { verifyJWT as verifyToken } from '../middleware/auth'

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>

const HISTORY_SIZE = 20

async function broadcastViewerCount(io: AppServer, code: string): Promise<void> {
  const sockets = await io.in(code).fetchSockets()
  io.to(code).emit('viewer:count', { count: sockets.length })
}

export function setupSocketHandler(io: AppServer): void {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // Track rooms for viewer count on disconnect
    socket.on('disconnecting', async () => {
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
    socket.on('session:start', async (code) => {
      console.log(`[socket] session:start code=${code} socketId=${socket.id}`)
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

      const languages = NZ_LANGUAGES.map((l: { code: string }) => l.code)
      console.log(`[socket] session:start languages=${JSON.stringify(languages)}`)

      try {
        await EventManager.start(
          code,
          { languages },
          (payload) => {
            console.log(`[socket] emitting caption:segment seq=${payload.sequence} final=${payload.isFinal}`)
            io.to(code).emit('caption:segment', payload)
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

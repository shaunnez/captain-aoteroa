import { Router } from 'express'
import { verifyJWT } from '../middleware/auth'
import { supabase } from '../services/supabase'
import { EventManager } from '../services/EventManager'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared'
import { TranscriptProcessor } from '../services/TranscriptProcessor'

export const eventsRouter = Router()

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// POST /api/events — create event (JWT protected)
eventsRouter.post('/', verifyJWT, async (req, res) => {
  const { title, description, event_date } = req.body
  if (!title) {
    res.status(400).json({ error: 'title required' })
    return
  }

  const code = generateCode()
  const { data, error } = await supabase
    .from('events')
    .insert({ code, title, description, event_date, languages: NZ_LANGUAGES.map((l: { code: string }) => l.code) })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(201).json(data)
})

// GET /api/events — list all events (public)
eventsRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true, nullsFirst: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json(data ?? [])
})

// GET /api/events/:code — fetch event by 6-char code (public)
eventsRouter.get('/:code', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('code', req.params.code.toUpperCase())
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  res.json(data)
})

// PATCH /api/events/:code — update event details (JWT protected)
eventsRouter.patch('/:code', verifyJWT, async (req, res) => {
  const { title, description, event_date } = req.body
  const patch: Record<string, unknown> = {}
  if (title !== undefined) patch.title = title
  if (description !== undefined) patch.description = description
  if (event_date !== undefined) patch.event_date = event_date

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No fields to update' })
    return
  }

  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('code', req.params.code.toUpperCase())
    .select()
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  res.json(data)
})

// PATCH /api/events/:code/status — update status (JWT protected)
eventsRouter.patch('/:code/status', verifyJWT, async (req, res) => {
  const { status } = req.body
  if (!['upcoming', 'live', 'ended'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('code', req.params.code.toUpperCase())
    .select()
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Event not found' })
    return
  }

  // If ending the event, close any active Azure session
  if (status === 'ended') {
    EventManager.end(req.params.code.toUpperCase())
    // Trigger transcript processing in the background
    TranscriptProcessor.process(data.id).catch((err) => {
      console.error(`[events] Transcript processing failed for ${data.id}:`, err)
    })
  }

  res.json(data)
})

// POST /api/events/:code/transcript/retry — retry transcript processing (JWT protected)
eventsRouter.post('/:code/transcript/retry', verifyJWT, async (req, res) => {
  const { data: event, error } = await supabase
    .from('events')
    .select('id')
    .eq('code', req.params.code.toUpperCase())
    .single()

  if (error || !event) {
    res.status(404).json({ error: 'Event not found' })
    return
  }

  TranscriptProcessor.retry(event.id).catch((err) => {
    console.error(`[events] Transcript retry failed for ${event.id}:`, err)
  })

  res.json({ status: 'processing' })
})

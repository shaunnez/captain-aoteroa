import { Router } from 'express'
import { verifyJWT } from '../middleware/auth'
import { supabase } from '../services/supabase'
import { EventManager } from '../services/EventManager'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared'

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
  }

  res.json(data)
})

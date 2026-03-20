import { Router } from 'express'
import { supabase } from '../services/supabase'

export const transcriptsRouter = Router()

// GET /api/events/:code/transcript — get transcript status and content
transcriptsRouter.get('/:code/transcript', async (req, res) => {
  // Look up event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('code', req.params.code.toUpperCase())
    .single()

  if (!event) {
    res.status(404).json({ error: 'Event not found' })
    return
  }

  // Look up transcript
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('id, status, generated_at')
    .eq('event_id', event.id)
    .single()

  if (!transcript) {
    res.json({ status: 'none', languages: [] })
    return
  }

  if (transcript.status !== 'ready') {
    res.json({ status: transcript.status, languages: [] })
    return
  }

  // Fetch transcript content per language
  const { data: languages } = await supabase
    .from('transcript_languages')
    .select('language, content')
    .eq('transcript_id', transcript.id)

  res.json({
    status: transcript.status,
    generated_at: transcript.generated_at,
    languages: languages ?? [],
  })
})

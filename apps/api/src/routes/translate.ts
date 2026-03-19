import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import { supabase } from '../services/supabase'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

export const translateRouter = Router()

interface TranslateBody {
  eventCode: string
  targetLanguage: string // Azure short code e.g. "ja"
  sinceSequence?: number
}

translateRouter.post('/', async (req, res) => {
  const { eventCode, targetLanguage, sinceSequence } = req.body as TranslateBody

  if (!eventCode || !targetLanguage) {
    return res.status(400).json({ error: 'eventCode and targetLanguage are required' })
  }

  // Resolve event
  const { data: eventRow } = await supabase
    .from('events')
    .select('id, languages')
    .eq('code', eventCode)
    .single()

  if (!eventRow) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Check if we already have cached translations for this language
  const query = supabase
    .from('caption_segments')
    .select('*')
    .eq('event_id', eventRow.id)
    .eq('is_final', true)
    .eq('language', targetLanguage)
    .order('sequence', { ascending: true })

  if (sinceSequence !== undefined) {
    query.gt('sequence', sinceSequence)
  }

  const { data: cached } = await query

  // Also fetch source segments (to know what needs translating)
  const sourceLanguage = eventRow.languages[0] // Primary source language
  const sourceQuery = supabase
    .from('caption_segments')
    .select('*')
    .eq('event_id', eventRow.id)
    .eq('is_final', true)
    .eq('language', sourceLanguage)
    .order('sequence', { ascending: true })

  if (sinceSequence !== undefined) {
    sourceQuery.gt('sequence', sinceSequence)
  }

  const { data: sourceSegments } = await sourceQuery

  if (!sourceSegments || sourceSegments.length === 0) {
    return res.json({ segments: [] })
  }

  // Determine which sequences need translation
  const cachedSequences = new Set((cached ?? []).map((r) => r.sequence))
  const needTranslation = sourceSegments.filter((s) => !cachedSequences.has(s.sequence))

  let newTranslations: Array<{ sequence: number; text: string }> = []

  if (needTranslation.length > 0) {
    // Call Azure Translator Text API (batch, up to 100 per request)
    const batches: typeof needTranslation[] = []
    for (let i = 0; i < needTranslation.length; i += 100) {
      batches.push(needTranslation.slice(i, i + 100))
    }

    for (const batch of batches) {
      const body = batch.map((s) => ({ Text: s.text }))
      const sourceCode = sourceLanguage.split('-')[0]

      const response = await fetch(
        `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${sourceCode}&to=${targetLanguage}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': config.azure.speechKey,
            'Ocp-Apim-Subscription-Region': config.azure.speechRegion,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) {
        console.error(`Azure Translator error: ${response.status} ${await response.text()}`)
        return res.status(502).json({ error: 'Translation service error' })
      }

      const results = (await response.json()) as Array<{
        translations: Array<{ text: string; to: string }>
      }>

      for (let i = 0; i < results.length; i++) {
        const translatedText = results[i].translations[0]?.text ?? ''
        newTranslations.push({ sequence: batch[i].sequence, text: translatedText })
      }
    }

    // Cache translated segments in DB
    const rows = newTranslations.map((t) => ({
      id: uuidv4(),
      event_id: eventRow.id,
      sequence: t.sequence,
      text: t.text,
      language: targetLanguage,
      is_final: true,
    }))

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('caption_segments').insert(rows)
      if (insertError) console.error('Failed to cache translations:', insertError.message)
    }
  }

  // Build response: combine cached + newly translated
  const allTranslated = [
    ...(cached ?? []).map((r) => ({ sequence: r.sequence, text: r.text })),
    ...newTranslations,
  ].sort((a, b) => a.sequence - b.sequence)

  // Build CaptionSegmentPayload format
  const segments: CaptionSegmentPayload[] = allTranslated.map((t) => ({
    id: uuidv4(),
    segments: { [targetLanguage]: t.text },
    isFinal: true,
    sequence: t.sequence,
  }))

  return res.json({ segments })
})

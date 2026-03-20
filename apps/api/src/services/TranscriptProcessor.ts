import { supabase } from './supabase'
import { config } from '../config'

interface TranscriptResult {
  language: string
  content: string
}

export class TranscriptProcessor {
  /**
   * Process all caption segments for an event into clean transcripts.
   * Called when event status changes to 'ended'.
   */
  static async process(eventId: string): Promise<void> {
    console.log(`[TranscriptProcessor] Starting for event ${eventId}`)

    // Create or get transcript record
    const { data: existing } = await supabase
      .from('transcripts')
      .select('id, status')
      .eq('event_id', eventId)
      .single()

    let transcriptId: string

    if (existing) {
      if (existing.status === 'processing') {
        console.log(`[TranscriptProcessor] Already processing event ${eventId}, skipping`)
        return
      }
      transcriptId = existing.id
      await supabase
        .from('transcripts')
        .update({ status: 'processing' })
        .eq('id', transcriptId)
    } else {
      const { data: created, error } = await supabase
        .from('transcripts')
        .insert({ event_id: eventId, status: 'processing' })
        .select('id')
        .single()

      if (error || !created) {
        console.error(`[TranscriptProcessor] Failed to create transcript record:`, error?.message)
        return
      }
      transcriptId = created.id
    }

    try {
      // Fetch all final caption segments grouped by language
      const { data: segments, error: segError } = await supabase
        .from('caption_segments')
        .select('text, language, sequence')
        .eq('event_id', eventId)
        .eq('is_final', true)
        .order('sequence', { ascending: true })

      if (segError || !segments || segments.length === 0) {
        console.log(`[TranscriptProcessor] No segments found for event ${eventId}`)
        await supabase
          .from('transcripts')
          .update({ status: 'failed' })
          .eq('id', transcriptId)
        return
      }

      // Group segments by language
      const byLanguage = new Map<string, string[]>()
      for (const seg of segments) {
        if (!byLanguage.has(seg.language)) {
          byLanguage.set(seg.language, [])
        }
        byLanguage.get(seg.language)!.push(seg.text)
      }

      // Process each language through Claude API
      const results: TranscriptResult[] = []

      for (const [language, texts] of byLanguage) {
        const rawText = texts.join(' ')

        if (!config.anthropicApiKey) {
          // No API key — store raw concatenation as-is
          console.log(`[TranscriptProcessor] No ANTHROPIC_API_KEY, storing raw text for ${language}`)
          results.push({ language, content: rawText })
          continue
        }

        try {
          const cleaned = await TranscriptProcessor.cleanWithClaude(rawText, language)
          results.push({ language, content: cleaned })
        } catch (err) {
          console.error(`[TranscriptProcessor] Claude API error for ${language}:`, err)
          // Fall back to raw text
          results.push({ language, content: rawText })
        }
      }

      // Delete existing transcript_languages for this transcript (retry case)
      await supabase
        .from('transcript_languages')
        .delete()
        .eq('transcript_id', transcriptId)

      // Insert results
      const rows = results.map((r) => ({
        transcript_id: transcriptId,
        language: r.language,
        content: r.content,
      }))

      const { error: insertError } = await supabase
        .from('transcript_languages')
        .insert(rows)

      if (insertError) {
        console.error(`[TranscriptProcessor] Failed to insert transcript languages:`, insertError.message)
        await supabase
          .from('transcripts')
          .update({ status: 'failed' })
          .eq('id', transcriptId)
        return
      }

      await supabase
        .from('transcripts')
        .update({ status: 'ready', generated_at: new Date().toISOString() })
        .eq('id', transcriptId)

      console.log(`[TranscriptProcessor] Completed for event ${eventId}, ${results.length} languages`)
    } catch (err) {
      console.error(`[TranscriptProcessor] Unexpected error:`, err)
      await supabase
        .from('transcripts')
        .update({ status: 'failed' })
        .eq('id', transcriptId)
    }
  }

  /**
   * Send raw caption text to Claude for cleanup.
   * Uses claude-haiku for speed and cost efficiency.
   */
  private static async cleanWithClaude(rawText: string, language: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `You are cleaning up a raw speech-to-text transcript in the language "${language}". The text comes from a live captioning session and may contain:
- Repeated words or stutters
- Missing punctuation
- Run-on sentences
- Minor transcription errors

Please clean up this transcript while preserving the original meaning and speaker's intent. Add proper punctuation, fix obvious errors, and break into natural paragraphs. Do NOT translate — keep the text in its original language. Return ONLY the cleaned transcript, no explanations.

Raw transcript:
${rawText}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Claude API error ${response.status}: ${errorText}`)
    }

    const result = (await response.json()) as {
      content: Array<{ type: string; text: string }>
    }

    return result.content[0]?.text ?? rawText
  }

  /**
   * Retry transcript processing for a specific event.
   */
  static async retry(eventId: string): Promise<void> {
    // Reset status to pending then reprocess
    await supabase
      .from('transcripts')
      .update({ status: 'pending' })
      .eq('event_id', eventId)

    await TranscriptProcessor.process(eventId)
  }
}

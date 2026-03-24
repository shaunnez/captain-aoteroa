import { useState, useEffect, useRef, useCallback } from 'react'
import { socket } from '../lib/socket'
import { api } from '../lib/api'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

export interface DisplaySegment {
  id: string
  text: string
  isFinal: boolean
  sequence: number
  isTranslating: boolean
}

interface UseCaptionsReturn {
  segments: DisplaySegment[]
  isConnected: boolean
  error: string | null
}

export function useCaptions(
  eventCode: string,
  locale: string,
  isConfiguredLanguage = true,
): UseCaptionsReturn {
  const [segments, setSegments] = useState<DisplaySegment[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Store all language variants; re-render when locale changes
  const allSegmentsRef = useRef<Map<number, CaptionSegmentPayload>>(new Map())
  const localeRef = useRef(locale)
  localeRef.current = locale
  const isConfiguredRef = useRef(isConfiguredLanguage)
  isConfiguredRef.current = isConfiguredLanguage

  const extractSegments = useCallback((): DisplaySegment[] => {
    return Array.from(allSegmentsRef.current.values())
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => {
        const locale = localeRef.current
        // Match short codes to BCP-47 keys and vice versa (e.g. 'mi' ↔ 'mi-NZ')
        const text = s.segments[locale]
          ?? Object.entries(s.segments).find(
            ([k]) => k.startsWith(locale + '-') || locale.startsWith(k + '-')
          )?.[1]
          ?? s.segments['en-NZ']
          ?? s.segments['en']
          ?? ''
        const hasTranslation = !!text
        return {
          id: s.id,
          text,
          isFinal: s.isFinal,
          sequence: s.sequence,
          isTranslating: s.isFinal && !isConfiguredRef.current && !hasTranslation,
        }
      })
  }, [])

  useEffect(() => {
    if (!socket.connected) socket.connect()

    console.log(`[captions] emitting event:join for ${eventCode} (socket.connected=${socket.connected})`)
    socket.emit('event:join', eventCode)
    setIsConnected(socket.connected)

    function onConnect() {
      console.log('[captions] socket connected')
      setIsConnected(true)
    }
    function onDisconnect(reason: string) {
      console.log(`[captions] socket disconnected reason=${reason}`)
      setIsConnected(false)
    }

    function onHistory(payload: { segments: CaptionSegmentPayload[] }) {
      console.log(`[captions] received caption:history count=${payload.segments.length}`)
      payload.segments.forEach((s) => allSegmentsRef.current.set(s.sequence, s))
      setSegments(extractSegments())
    }

    function onSegment(payload: CaptionSegmentPayload) {
      console.log(`[captions] received caption:segment seq=${payload.sequence} final=${payload.isFinal} text="${Object.values(payload.segments)[0]}"`)
      // Interim segments replace each other (same sequence overwrite is fine)
      // Final segments are kept permanently
      allSegmentsRef.current.set(payload.sequence, payload)
      setSegments(extractSegments())
    }

    function onError(payload: { message: string }) {
      console.error(`[captions] received caption:error: ${payload.message}`)
      setError(payload.message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('caption:history', onHistory)
    socket.on('caption:segment', onSegment)
    socket.on('caption:error', onError)

    return () => {
      socket.emit('event:leave', eventCode)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('caption:history', onHistory)
      socket.off('caption:segment', onSegment)
      socket.off('caption:error', onError)
    }
  }, [eventCode, extractSegments])

  // Re-derive display segments when locale changes
  useEffect(() => {
    setSegments(extractSegments())
  }, [locale, extractSegments])

  // On-demand translation polling for non-configured languages
  const sinceSequenceRef = useRef(0)

  useEffect(() => {
    if (isConfiguredLanguage || !eventCode || !locale) return

    // Reset tracking when locale changes
    sinceSequenceRef.current = 0

    let cancelled = false

    async function poll() {
      if (cancelled) return
      try {
        const { data } = await api.post('/api/translate', {
          eventCode,
          targetLanguage: locale,
          sinceSequence: sinceSequenceRef.current,
        })

        if (cancelled) return

        const translated = data.segments as CaptionSegmentPayload[]
        if (translated.length > 0) {
          for (const seg of translated) {
            // Merge translated text into existing segment or create new entry
            const existing = allSegmentsRef.current.get(seg.sequence)
            if (existing) {
              existing.segments[locale] = seg.segments[locale] ?? ''
            } else {
              allSegmentsRef.current.set(seg.sequence, seg)
            }
            if (seg.sequence > sinceSequenceRef.current) {
              sinceSequenceRef.current = seg.sequence
            }
          }
          setSegments(extractSegments())
        }
      } catch (err) {
        console.error('[captions] translation poll error:', err)
      }
    }

    // Initial fetch
    poll()
    // Poll every 5 seconds
    const id = setInterval(poll, 5000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [eventCode, locale, isConfiguredLanguage, extractSegments])

  return { segments, isConnected, error }
}

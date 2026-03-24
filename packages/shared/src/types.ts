export { NZ_LANGUAGES } from './nzLanguages.js'
export type { NzLanguage } from './nzLanguages.js'
export { RECOGNITION_LOCALES } from './recognitionLocales.js'
export { TTS_SUPPORTED_LANGUAGES } from './ttsLanguages.js'

// Domain types
export interface Event {
  id: string
  code: string          // 6-char e.g. "KAI492"
  title: string
  description: string | null
  status: 'upcoming' | 'live' | 'ended'
  event_date: string | null
  languages: string[]   // BCP-47 locales e.g. ["en-NZ", "mi-NZ"]
  created_at: string
  organiser_name?: string
  image_url?: string
  logo_url?: string
  theme_color?: string
}

export interface CaptionSegment {
  id: string
  event_id: string
  sequence: number
  text: string
  language: string      // BCP-47 locale (source language)
  is_final: boolean
  created_at: string
  segments?: Record<string, string>  // JSONB: all locale → text variants
}

// Socket.io event payloads
export interface CaptionSegmentPayload {
  id: string
  segments: Record<string, string>  // locale → text
  isFinal: boolean
  sequence: number
}

export interface CaptionHistoryPayload {
  segments: CaptionSegmentPayload[]
}

export interface CaptionErrorPayload {
  message: string
  fatal?: boolean
}

export interface QaQuestion {
  id: string
  event_id: string
  body: string
  language: string
  translations: Record<string, string>
  status: 'pending' | 'pinned' | 'dismissed'
  created_at: string
}

// Socket.io event map (used for typing socket.on/emit)
export interface ServerToClientEvents {
  'caption:segment': (payload: CaptionSegmentPayload) => void
  'caption:history': (payload: CaptionHistoryPayload) => void
  'caption:error': (payload: CaptionErrorPayload) => void
  'viewer:count': (payload: { count: number }) => void
  'audio:tts': (payload: { language: string; sequence: number; data: ArrayBuffer }) => void
  'audio:tts-stream': (payload: { language: string; sequence: number; chunk: ArrayBuffer; done: boolean }) => void
  'qa:new': (payload: { question: QaQuestion }) => void
  'qa:update': (payload: { question: QaQuestion }) => void
  'qa:history': (payload: { questions: QaQuestion[] }) => void
  'reaction:burst': (payload: { emoji: string; count: number }) => void
}

export interface ClientToServerEvents {
  'audio:chunk': (chunk: ArrayBuffer) => void
  'event:join': (code: string) => void
  'event:leave': (code: string) => void
  'session:start': (payload: { code: string; locale?: string }) => void
  'session:end': (code: string) => void
  'session:set-language': (payload: { code: string; locale: string }) => void
  'session:set-mode': (payload: { code: string; mode: 'single' | 'dual' }) => void
  'audio:subscribe': (payload: { code: string; language: string }) => void
  'audio:unsubscribe': (payload: { code: string; language: string }) => void
  'qa:submit': (payload: { code: string; body: string; language: string }) => void
  'qa:moderate': (payload: { code: string; questionId: string; status: 'pending' | 'pinned' | 'dismissed' }) => void
  'reaction:send': (payload: { code: string; emoji: string }) => void
}

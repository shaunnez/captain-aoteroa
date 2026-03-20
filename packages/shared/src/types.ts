export { NZ_LANGUAGES } from './nzLanguages.js'
export type { NzLanguage } from './nzLanguages.js'
export { RECOGNITION_LOCALES } from './recognitionLocales.js'

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
}

export interface CaptionSegment {
  id: string
  event_id: string
  sequence: number
  text: string
  language: string      // BCP-47 locale
  is_final: boolean
  created_at: string
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

// Socket.io event map (used for typing socket.on/emit)
export interface ServerToClientEvents {
  'caption:segment': (payload: CaptionSegmentPayload) => void
  'caption:history': (payload: CaptionHistoryPayload) => void
  'caption:error': (payload: CaptionErrorPayload) => void
  'viewer:count': (payload: { count: number }) => void
}

export interface ClientToServerEvents {
  'audio:chunk': (chunk: ArrayBuffer) => void
  'event:join': (code: string) => void
  'event:leave': (code: string) => void
  'session:start': (code: string) => void
  'session:end': (code: string) => void
  'session:set-language': (payload: { code: string; locale: string }) => void
  'session:set-mode': (payload: { code: string; mode: 'single' | 'dual' }) => void
}

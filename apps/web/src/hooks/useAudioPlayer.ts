import { useState, useEffect, useRef } from 'react'
import { socket } from '../lib/socket'

interface AudioTtsPayload {
  language: string
  sequence: number
  data: ArrayBuffer
}

interface AudioTtsStreamPayload {
  language: string
  sequence: number
  chunk: ArrayBuffer
  done: boolean
}

// Languages that use realtime PCM streaming from OpenAI TTS
const STREAMING_LANGUAGES = new Set(['mi'])

// OpenAI PCM format: 24kHz, 16-bit signed LE, mono
const OPENAI_SAMPLE_RATE = 24000

export function useAudioPlayer(eventCode: string, language: string) {
  const [isEnabled, setIsEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const queueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)
  const languageRef = useRef(language)
  // Accumulate Int16 PCM chunks per sequence number until done:true arrives
  const pendingChunksRef = useRef<Map<number, ArrayBuffer[]>>(new Map())

  useEffect(() => {
    if (!isEnabled) {
      languageRef.current = language
      return
    }

    // Subscribe for this language and set up the correct listener
    languageRef.current = language
    const activeLanguage = language
    socket.emit('audio:subscribe', { code: eventCode, language })

    const isStreaming = STREAMING_LANGUAGES.has(language)
    const sampleRate = isStreaming ? OPENAI_SAMPLE_RATE : undefined
    const audioCtx = new AudioContext(sampleRate ? { sampleRate } : undefined)
    audioCtxRef.current = audioCtx

    function playNext() {
      if (queueRef.current.length === 0) {
        isPlayingRef.current = false
        return
      }
      isPlayingRef.current = true
      const buffer = queueRef.current.shift()!
      const source = audioCtx.createBufferSource()
      source.buffer = buffer
      source.connect(audioCtx.destination)
      source.onended = playNext
      source.start()
    }

    function enqueue(audioBuffer: AudioBuffer) {
      queueRef.current.push(audioBuffer)
      if (!isPlayingRef.current) playNext()
    }

    let cleanup: () => void

    if (isStreaming) {
      function handleStream({ language: lang, sequence, chunk, done }: AudioTtsStreamPayload) {
        if (lang !== languageRef.current) return

        if (!done) {
          // Accumulate chunks for this segment
          const existing = pendingChunksRef.current.get(sequence) ?? []
          existing.push(chunk)
          pendingChunksRef.current.set(sequence, existing)
          return
        }

        // done:true — convert accumulated Int16 PCM to AudioBuffer and enqueue
        const chunks = pendingChunksRef.current.get(sequence)
        pendingChunksRef.current.delete(sequence)
        if (!chunks || chunks.length === 0) return

        // Concatenate all chunk ArrayBuffers
        const totalBytes = chunks.reduce((sum, c) => sum + c.byteLength, 0)
        const combined = new Uint8Array(totalBytes)
        let offset = 0
        for (const c of chunks) {
          combined.set(new Uint8Array(c), offset)
          offset += c.byteLength
        }

        // Convert Int16 LE → Float32
        const int16 = new Int16Array(combined.buffer)
        const audioBuffer = audioCtx.createBuffer(1, int16.length, OPENAI_SAMPLE_RATE)
        const float32 = audioBuffer.getChannelData(0)
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0
        }

        enqueue(audioBuffer)
      }

      socket.on('audio:tts-stream', handleStream)
      cleanup = () => socket.off('audio:tts-stream', handleStream)
    } else {
      function handleAudioTts({ language: lang, data }: AudioTtsPayload) {
        if (lang !== languageRef.current) return
        audioCtx.decodeAudioData(data.slice(0)).then((buffer) => {
          enqueue(buffer)
        }).catch((err) => {
          console.error('[useAudioPlayer] decodeAudioData failed:', err)
        })
      }

      socket.on('audio:tts', handleAudioTts)
      cleanup = () => socket.off('audio:tts', handleAudioTts)
    }

    return () => {
      socket.emit('audio:unsubscribe', { code: eventCode, language: activeLanguage })
      cleanup()
      audioCtx.close()
      audioCtxRef.current = null
      queueRef.current = []
      isPlayingRef.current = false
      pendingChunksRef.current.clear()
    }
  }, [isEnabled, eventCode, language]) // eslint-disable-line react-hooks/exhaustive-deps

  const enable = () => {
    setIsEnabled(true)
  }

  const disable = () => {
    setIsEnabled(false)
  }

  return { isEnabled, enable, disable }
}

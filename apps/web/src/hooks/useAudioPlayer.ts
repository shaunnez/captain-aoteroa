import { useState, useEffect, useRef } from 'react'
import { socket } from '../lib/socket'

interface AudioTtsPayload {
  language: string
  sequence: number
  data: ArrayBuffer
}

export function useAudioPlayer(eventCode: string, language: string) {
  const [isEnabled, setIsEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  // Queue of decoded AudioBuffers waiting to play
  const queueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)
  const languageRef = useRef(language)

  // When language changes while enabled, re-subscribe to the new language
  useEffect(() => {
    if (!isEnabled) {
      languageRef.current = language
      return
    }
    const prev = languageRef.current
    if (prev !== language) {
      socket.emit('audio:unsubscribe', { code: eventCode, language: prev })
      socket.emit('audio:subscribe', { code: eventCode, language })
      languageRef.current = language
      queueRef.current = []
    }
  }, [language, isEnabled, eventCode])

  // Main audio effect: set up AudioContext + socket listener while enabled.
  // Cleanup emits audio:unsubscribe — this is the single place unsubscription happens
  // (covers both disable() and unmount-while-enabled).
  useEffect(() => {
    if (!isEnabled) return

    languageRef.current = language
    const audioCtx = new AudioContext()
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

    function handleAudioTts({ language: lang, data }: AudioTtsPayload) {
      if (lang !== languageRef.current) return
      audioCtx.decodeAudioData(data.slice(0)).then((buffer) => {
        queueRef.current.push(buffer)
        if (!isPlayingRef.current) playNext()
      }).catch((err) => {
        console.error('[useAudioPlayer] decodeAudioData failed:', err)
      })
    }

    socket.on('audio:tts', handleAudioTts)

    return () => {
      socket.emit('audio:unsubscribe', { code: eventCode, language: languageRef.current })
      socket.off('audio:tts', handleAudioTts)
      audioCtx.close()
      audioCtxRef.current = null
      queueRef.current = []
      isPlayingRef.current = false
    }
  }, [isEnabled, eventCode])

  const enable = () => {
    languageRef.current = language
    socket.emit('audio:subscribe', { code: eventCode, language })
    setIsEnabled(true)
  }

  // disable() only sets state — the effect cleanup above handles audio:unsubscribe
  const disable = () => {
    setIsEnabled(false)
  }

  return { isEnabled, enable, disable }
}

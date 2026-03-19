import { useRef, useState, useCallback } from 'react'
import { socket } from '../lib/socket'

interface UseAudioCaptureReturn {
  isCapturing: boolean
  start: () => Promise<void>
  stop: () => void
  error: string | null
}

export function useAudioCapture(eventCode: string): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      // AudioContext must be created at 16kHz to match Azure's expected format
      const ctx = new AudioContext({ sampleRate: 16000 })
      contextRef.current = ctx

      // Load the PCM worklet
      await ctx.audioWorklet.addModule('/audio-processor.js')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
      })
      streamRef.current = stream

      const source = ctx.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(ctx, 'pcm-processor')
      workletRef.current = worklet

      // Each message is an ArrayBuffer of Int16 PCM samples
      let chunksSent = 0
      worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        chunksSent++
        if (chunksSent <= 3 || chunksSent % 100 === 0) {
          console.log(`[audio] chunk #${chunksSent} size=${e.data.byteLength} socketConnected=${socket.connected}`)
        }
        socket.emit('audio:chunk', e.data)
      }

      source.connect(worklet)
      // Connect to destination to keep the graph alive (no audio output)
      worklet.connect(ctx.destination)

      if (!socket.connected) socket.connect()
      console.log(`[audio] emitting session:start for ${eventCode}`)
      socket.emit('session:start', eventCode)
      setIsCapturing(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access failed')
    }
  }, [eventCode])

  const stop = useCallback(() => {
    workletRef.current?.disconnect()
    workletRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    contextRef.current?.close()
    contextRef.current = null
    socket.emit('session:end', eventCode)
    setIsCapturing(false)
  }, [eventCode])

  return { isCapturing, start, stop, error }
}

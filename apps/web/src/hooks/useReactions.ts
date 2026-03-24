import { useState, useEffect, useCallback, useRef } from 'react'
import { socket } from '../lib/socket'

export interface FloatingReaction {
  id: number
  emoji: string
  x: number // 0-100 percentage
}

let nextId = 0

export function useReactions(code: string) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const lastSent = useRef(0)

  useEffect(() => {
    function onBurst({ emoji, count }: { emoji: string; count: number }) {
      const newReactions: FloatingReaction[] = Array.from({ length: count }, () => ({
        id: nextId++,
        emoji,
        x: 10 + Math.random() * 80,
      }))
      setReactions((prev) => [...prev, ...newReactions])

      // Clean up after animation
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => !newReactions.includes(r)))
      }, 2200)
    }

    socket.on('reaction:burst', onBurst)
    return () => { socket.off('reaction:burst', onBurst) }
  }, [code])

  const sendReaction = useCallback((emoji: string) => {
    const now = Date.now()
    if (now - lastSent.current < 500) return // client debounce
    lastSent.current = now
    socket.emit('reaction:send', { code, emoji })
  }, [code])

  return { reactions, sendReaction }
}

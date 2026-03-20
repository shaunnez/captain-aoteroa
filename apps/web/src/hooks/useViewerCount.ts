import { useState, useEffect } from 'react'
import { socket } from '../lib/socket'

export function useViewerCount(eventCode: string): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    function onViewerCount(payload: { count: number }) {
      setCount(payload.count)
    }

    socket.on('viewer:count', onViewerCount)

    return () => {
      socket.off('viewer:count', onViewerCount)
    }
  }, [eventCode])

  return count
}

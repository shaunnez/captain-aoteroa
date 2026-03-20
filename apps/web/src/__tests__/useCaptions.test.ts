import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock socket
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockEmit = vi.fn()
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('../lib/socket', () => ({
  socket: {
    connected: true,
    on: (...args: any[]) => mockOn(...args),
    off: (...args: any[]) => mockOff(...args),
    emit: (...args: any[]) => mockEmit(...args),
    connect: () => mockConnect(),
    disconnect: () => mockDisconnect(),
  },
}))

import { useCaptions } from '../hooks/useCaptions'

describe('useCaptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connects socket and joins event room', () => {
    renderHook(() => useCaptions('ABC123', 'en', true))
    expect(mockConnect).toHaveBeenCalled()
    expect(mockEmit).toHaveBeenCalledWith('event:join', 'ABC123')
  })

  it('registers caption:segment listener', () => {
    renderHook(() => useCaptions('ABC123', 'en', true))
    expect(mockOn).toHaveBeenCalledWith('caption:segment', expect.any(Function))
  })

  it('registers caption:history listener', () => {
    renderHook(() => useCaptions('ABC123', 'en', true))
    expect(mockOn).toHaveBeenCalledWith('caption:history', expect.any(Function))
  })

  it('returns empty segments initially', () => {
    const { result } = renderHook(() => useCaptions('ABC123', 'en', true))
    expect(result.current.segments).toEqual([])
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useCaptions('ABC123', 'en', true))
    unmount()
    expect(mockEmit).toHaveBeenCalledWith('event:leave', 'ABC123')
    expect(mockOff).toHaveBeenCalled()
  })
})

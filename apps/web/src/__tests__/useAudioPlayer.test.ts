import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}))

const mockEmit = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()

vi.mock('../lib/socket', () => ({
  socket: {
    connected: true,
    emit: (...args: any[]) => mockEmit(...args),
    on: (...args: any[]) => mockOn(...args),
    off: (...args: any[]) => mockOff(...args),
  },
}))

// AudioContext is not available in jsdom — stub it
const decodeAudioDataMock = vi.fn().mockResolvedValue({})
const createBufferSourceMock = vi.fn(() => ({
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  onended: null,
}))
const destinationMock = {}
const closeMock = vi.fn()

vi.stubGlobal('AudioContext', vi.fn(() => ({
  decodeAudioData: decodeAudioDataMock,
  createBufferSource: createBufferSourceMock,
  destination: destinationMock,
  close: closeMock,
})))

import { useAudioPlayer } from '../hooks/useAudioPlayer'

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts disabled', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    expect(result.current.isEnabled).toBe(false)
  })

  it('emits audio:subscribe when enabled', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    expect(mockEmit).toHaveBeenCalledWith('audio:subscribe', { code: 'EVT1', language: 'mi' })
    expect(result.current.isEnabled).toBe(true)
  })

  it('emits audio:unsubscribe when disabled (via effect cleanup)', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    act(() => result.current.disable())
    // audio:unsubscribe is emitted by the isEnabled effect cleanup, not disable() directly
    expect(mockEmit).toHaveBeenCalledWith('audio:unsubscribe', { code: 'EVT1', language: 'mi' })
    expect(result.current.isEnabled).toBe(false)
  })

  it('registers audio:tts listener when enabled', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    expect(mockOn).toHaveBeenCalledWith('audio:tts', expect.any(Function))
  })

  it('unregisters audio:tts listener and emits unsubscribe on unmount while enabled', () => {
    const { result, unmount } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    unmount()
    expect(mockOff).toHaveBeenCalledWith('audio:tts', expect.any(Function))
    expect(mockEmit).toHaveBeenCalledWith('audio:unsubscribe', { code: 'EVT1', language: 'mi' })
  })

  it('re-subscribes when language changes while enabled', () => {
    const { result, rerender } = renderHook(
      ({ lang }) => useAudioPlayer('EVT1', lang),
      { initialProps: { lang: 'mi' } }
    )
    act(() => result.current.enable())
    rerender({ lang: 'zh-Hans' })
    expect(mockEmit).toHaveBeenCalledWith('audio:unsubscribe', { code: 'EVT1', language: 'mi' })
    expect(mockEmit).toHaveBeenCalledWith('audio:subscribe', { code: 'EVT1', language: 'zh-Hans' })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockEmit = vi.fn()
const mockConnect = vi.fn()

vi.mock('../lib/socket', () => ({
  socket: {
    connected: false,
    emit: (...args: any[]) => mockEmit(...args),
    connect: () => mockConnect(),
  },
}))

// Web Audio API mocks
const mockPortOnMessage = { onmessage: null as any }
const mockWorkletDisconnect = vi.fn()
const mockWorkletConnect = vi.fn()
const mockWorklet = {
  port: mockPortOnMessage,
  connect: mockWorkletDisconnect,
  disconnect: mockWorkletDisconnect,
}
const mockSourceConnect = vi.fn()
const mockAddModule = vi.fn().mockResolvedValue(undefined)
const mockCreateMediaStreamSource = vi.fn().mockReturnValue({ connect: mockSourceConnect })
const mockContextClose = vi.fn().mockResolvedValue(undefined)
const mockAudioContext = {
  audioWorklet: { addModule: (...args: any[]) => mockAddModule(...args) },
  createMediaStreamSource: (...args: any[]) => mockCreateMediaStreamSource(...args),
  destination: {},
  close: () => mockContextClose(),
}

vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext))
vi.stubGlobal('AudioWorkletNode', vi.fn(() => mockWorklet))

const mockTrackStop = vi.fn()
const mockStream = { getTracks: () => [{ stop: mockTrackStop }] }

beforeEach(() => {
  vi.clearAllMocks()
  mockAddModule.mockResolvedValue(undefined)
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    writable: true,
  })
})

import { useAudioCapture } from '../hooks/useAudioCapture'

describe('useAudioCapture', () => {
  it('starts with isCapturing false and no error', () => {
    const { result } = renderHook(() => useAudioCapture('EVT1'))
    expect(result.current.isCapturing).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('start() emits session:start and sets isCapturing true', async () => {
    const { result } = renderHook(() => useAudioCapture('EVT1'))
    await act(async () => {
      await result.current.start('en-NZ')
    })
    expect(mockEmit).toHaveBeenCalledWith('session:start', { code: 'EVT1', locale: 'en-NZ' })
    expect(result.current.isCapturing).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('start() sets error when getUserMedia rejects', async () => {
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Permission denied')
    )
    const { result } = renderHook(() => useAudioCapture('EVT1'))
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.isCapturing).toBe(false)
    expect(result.current.error).toBe('Permission denied')
  })

  it('stop() emits session:end and sets isCapturing false', async () => {
    const { result } = renderHook(() => useAudioCapture('EVT1'))
    await act(async () => {
      await result.current.start()
    })
    act(() => {
      result.current.stop()
    })
    expect(mockEmit).toHaveBeenCalledWith('session:end', 'EVT1')
    expect(result.current.isCapturing).toBe(false)
  })

  it('stop() tears down stream tracks', async () => {
    const { result } = renderHook(() => useAudioCapture('EVT1'))
    await act(async () => {
      await result.current.start()
    })
    act(() => {
      result.current.stop()
    })
    expect(mockTrackStop).toHaveBeenCalledTimes(1)
    expect(mockContextClose).toHaveBeenCalledTimes(1)
  })
})

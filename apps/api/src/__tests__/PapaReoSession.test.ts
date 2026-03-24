import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ws
const mockWsSend = vi.fn()
const mockWsClose = vi.fn()
let mockWsOnHandlers: Record<string, Function> = {}

vi.mock('ws', () => {
  const WebSocket = vi.fn().mockImplementation(() => {
    const ws = {
      send: mockWsSend,
      close: mockWsClose,
      readyState: 1, // OPEN
      on: vi.fn((event: string, handler: Function) => {
        mockWsOnHandlers[event] = handler
        if (event === 'open') setTimeout(() => handler(), 0)
      }),
    }
    return ws
  }) as any
  WebSocket.OPEN = 1
  return {
    WebSocket,
  }
})

// Mock supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'event-uuid' } }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

// Mock config
vi.mock('../config', () => ({
  config: {
    papaReo: {
      token: 'test-token',
      apiUrl: 'https://api.papareo.io',
    },
  },
}))

// Mock fetch for create_session
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ websocket_url: 'wss://papareo.test/ws' }),
})
vi.stubGlobal('fetch', mockFetch)

import { PapaReoSession } from '../services/PapaReoSession'

describe('PapaReoSession', () => {
  let session: PapaReoSession
  let onSegment: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockWsOnHandlers = {}
    onSegment = vi.fn()
    onError = vi.fn()
    // Re-stub fetch after clearAllMocks
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ websocket_url: 'wss://papareo.test/ws' }),
    })
    session = new PapaReoSession({
      eventCode: 'TEST01',
      onSegment,
      onError,
    })
  })

  it('creates a session via HTTP POST', async () => {
    await session.start()
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.papareo.io/tuhi/create_session',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('forwards audio chunks via WebSocket', async () => {
    await session.start()
    const chunk = Buffer.from('audio-data')
    session.pushChunk(chunk)
    expect(mockWsSend).toHaveBeenCalledWith(chunk)
  })

  it('emits segments from incoming messages', async () => {
    await session.start()
    // Simulate incoming transcription message
    const msg = JSON.stringify({ text: 'Kia ora', is_final: true })
    mockWsOnHandlers['message']?.(Buffer.from(msg))
    expect(onSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        segments: { 'mi': 'Kia ora' },
        isFinal: true,
      }),
    )
  })

  it('stops cleanly', async () => {
    await session.start()
    await session.stop()
    expect(mockWsClose).toHaveBeenCalled()
  })
})

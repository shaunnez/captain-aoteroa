import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'event-uuid' } }),
    })),
  },
}))

vi.mock('../services/EventManager', () => ({
  EventManager: {
    start: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(false),
    pushChunk: vi.fn(),
    setLanguage: vi.fn().mockResolvedValue(undefined),
    setMode: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../middleware/auth', () => ({
  verifyJWT: vi.fn(),
}))

import { setupSocketHandler } from '../services/SocketHandler'
import { EventManager } from '../services/EventManager'

function createMockSocket() {
  const handlers: Record<string, Function> = {}
  return {
    id: 'test-socket-id',
    handshake: { auth: {} },
    rooms: new Set(['test-socket-id']),
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] = handler
    }),
    join: vi.fn((room: string) => {}),
    leave: vi.fn(),
    emit: vi.fn(),
    _handlers: handlers,
  }
}

function createMockIO() {
  let connectionHandler: Function
  const mockEmit = vi.fn()
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (event === 'connection') connectionHandler = handler
    }),
    to: vi.fn(() => ({ emit: mockEmit })),
    in: vi.fn(() => ({ fetchSockets: vi.fn().mockResolvedValue([]) })),
    _connect: (socket: any) => connectionHandler(socket),
    _emit: mockEmit,
  }
}

describe('SocketHandler', () => {
  let mockIO: ReturnType<typeof createMockIO>
  let mockSocket: ReturnType<typeof createMockSocket>

  beforeEach(() => {
    vi.clearAllMocks()
    mockIO = createMockIO()
    mockSocket = createMockSocket()
    setupSocketHandler(mockIO as any)
  })

  it('registers connection handler', () => {
    expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function))
  })

  it('registers event handlers on socket connection', () => {
    mockIO._connect(mockSocket)
    expect(mockSocket.on).toHaveBeenCalledWith('event:join', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('event:leave', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('session:start', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('session:end', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('audio:chunk', expect.any(Function))
  })

  it('joins room on event:join', async () => {
    mockIO._connect(mockSocket)
    await mockSocket._handlers['event:join']('ABC123')
    expect(mockSocket.join).toHaveBeenCalledWith('ABC123')
  })

  it('leaves room on event:leave', async () => {
    mockIO._connect(mockSocket)
    await mockSocket._handlers['event:leave']('ABC123')
    expect(mockSocket.leave).toHaveBeenCalledWith('ABC123')
  })

  it('rejects session:start without auth token', async () => {
    mockIO._connect(mockSocket)
    await mockSocket._handlers['session:start']('ABC123')
    expect(mockSocket.emit).toHaveBeenCalledWith('caption:error', expect.objectContaining({ fatal: true }))
  })
})

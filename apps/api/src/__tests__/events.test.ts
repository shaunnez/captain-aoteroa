import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../index'
import * as supabaseModule from '../services/supabase'

// Mock supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock the auth middleware to always pass in tests
vi.mock('../middleware/auth', () => ({
  verifyJWT: vi.fn((_req: any, _res: any, next: any) => next()),
}))

const mockEvent = {
  id: 'uuid-1',
  code: 'KAI492',
  title: 'Test Event',
  description: null,
  status: 'upcoming',
  event_date: null,
  created_at: new Date().toISOString(),
}

function mockChain(returnData: unknown, error: unknown = null) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error }),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: returnData ? [returnData] : [], error }),
  }
  vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('POST /api/events', () => {
  it('creates an event and returns it with a code', async () => {
    mockChain(mockEvent)
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer test-token')
      .send({ title: 'Test Event' })
    expect(res.status).toBe(201)
    expect(res.body.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('returns 400 without title', async () => {
    mockChain(mockEvent)
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer test-token')
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('GET /api/events/:code', () => {
  it('returns event by code', async () => {
    mockChain(mockEvent)
    const res = await request(app).get('/api/events/KAI492')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe('KAI492')
  })

  it('returns 404 when not found', async () => {
    mockChain(null, { code: 'PGRST116', message: 'Not found' })
    const res = await request(app).get('/api/events/XXXXXX')
    expect(res.status).toBe(404)
  })
})

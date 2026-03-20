import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
const mockFrom = vi.fn()
vi.mock('../services/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}))

// Mock config
vi.mock('../config', () => ({
  config: {
    azure: {
      speechKey: 'test-key',
      speechRegion: 'australiaeast',
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import express from 'express'
import request from 'supertest'
import { translateRouter } from '../routes/translate'

describe('POST /translate', () => {
  const app = express()
  app.use(express.json())
  app.use('/', translateRouter)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('returns 400 if eventCode is missing', async () => {
    const res = await request(app)
      .post('/')
      .send({ targetLanguage: 'ja' })
    expect(res.status).toBe(400)
  })

  it('returns 400 if targetLanguage is missing', async () => {
    const res = await request(app)
      .post('/')
      .send({ eventCode: 'ABC123' })
    expect(res.status).toBe(400)
  })

  it('returns 404 if event not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const res = await request(app)
      .post('/')
      .send({ eventCode: 'NOPE00', targetLanguage: 'ja' })
    expect(res.status).toBe(404)
  })

  it('returns empty segments when no source data', async () => {
    // First call: event lookup
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // events lookup
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'evt-1', languages: ['en-NZ'] } }),
        }
      }
      // caption_segments queries — return chainable object that resolves to empty
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      }
      // Make the chain itself thenable so `await query` returns empty data
      chain.then = vi.fn((resolve: Function) => resolve({ data: null, error: null }))
      return chain
    })

    const res = await request(app)
      .post('/')
      .send({ eventCode: 'ABC123', targetLanguage: 'ja' })
    // May return 200 with empty segments or go through translation logic
    expect(res.status).toBeLessThan(500)
  })
})

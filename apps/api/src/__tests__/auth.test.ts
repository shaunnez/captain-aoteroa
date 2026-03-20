import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { app } from '../index'

describe('GET /api/auth/me', () => {
  it('returns 401 without authorization header', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Not authenticated')
  })

  it('returns authenticated true with a bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer some-token')
    expect(res.status).toBe(200)
    expect(res.body.authenticated).toBe(true)
  })

  it('returns 401 without Bearer prefix', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'some-token')
    expect(res.status).toBe(401)
  })
})

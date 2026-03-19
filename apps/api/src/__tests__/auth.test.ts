import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../index'

// Override config for tests
process.env.PRESENTER_SECRET = 'test-secret'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.CLIENT_URL = 'http://localhost:5173'

describe('POST /api/auth/login', () => {
  it('returns 200 + JWT token with correct password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'test-secret' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(typeof res.body.token).toBe('string')
  })

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.token).toBeUndefined()
  })

  it('returns 400 with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})
    expect(res.status).toBe(400)
  })
})

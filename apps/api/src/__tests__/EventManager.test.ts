import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/AzureSession', () => ({
  AzureSession: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    pushChunk: vi.fn(),
    restart: vi.fn().mockResolvedValue(undefined),
  })),
}))

import { EventManager } from '../services/EventManager'

describe('EventManager', () => {
  beforeEach(() => EventManager.clear())

  it('starts a new session for a code', async () => {
    const onSegment = vi.fn()
    await EventManager.start('KAI492', {}, onSegment, vi.fn())
    expect(EventManager.has('KAI492')).toBe(true)
  })

  it('pushes a chunk to an active session', async () => {
    const onSegment = vi.fn()
    await EventManager.start('KAI492', {}, onSegment, vi.fn())
    const chunk = Buffer.alloc(320)
    EventManager.pushChunk('KAI492', chunk)
    // No error thrown = pass
  })

  it('ends and removes a session', async () => {
    await EventManager.start('KAI492', {}, vi.fn(), vi.fn())
    await EventManager.end('KAI492')
    expect(EventManager.has('KAI492')).toBe(false)
  })

  it('does not throw when ending a non-existent session', async () => {
    await expect(EventManager.end('XXXXXX')).resolves.not.toThrow()
  })
})

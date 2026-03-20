import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AzureSession
vi.mock('../services/AzureSession', () => {
  return {
    AzureSession: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      pushChunk: vi.fn(),
      restart: vi.fn().mockResolvedValue(undefined),
      setLanguage: vi.fn().mockResolvedValue(undefined),
    })),
  }
})

import { DualAzureSession } from '../services/DualAzureSession'
import { AzureSession } from '../services/AzureSession'

describe('DualAzureSession', () => {
  let session: DualAzureSession
  let onSegment: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    onSegment = vi.fn()
    onError = vi.fn()
    session = new DualAzureSession({
      eventCode: 'TEST01',
      languages: ['en-NZ', 'mi-NZ', 'sm'],
      onSegment,
      onError,
    })
  })

  it('creates two AzureSession instances on start', async () => {
    await session.start()
    expect(AzureSession).toHaveBeenCalledTimes(2)
    // First call should be en-NZ, second mi-NZ
    expect(AzureSession).toHaveBeenCalledWith(
      expect.objectContaining({ speakerLocale: 'en-NZ' }),
    )
    expect(AzureSession).toHaveBeenCalledWith(
      expect.objectContaining({ speakerLocale: 'mi-NZ' }),
    )
  })

  it('shares a sequence counter between sessions', async () => {
    await session.start()
    const calls = vi.mocked(AzureSession).mock.calls
    expect(calls[0][0].sharedSequence).toBeDefined()
    expect(calls[0][0].sharedSequence).toBe(calls[1][0].sharedSequence)
  })

  it('forwards audio chunks to both sessions', async () => {
    await session.start()
    const instances = vi.mocked(AzureSession).mock.results.map((r) => r.value)
    const chunk = Buffer.from('test-audio')
    session.pushChunk(chunk)
    expect(instances[0].pushChunk).toHaveBeenCalledWith(chunk)
    expect(instances[1].pushChunk).toHaveBeenCalledWith(chunk)
  })

  it('stops both sessions on stop', async () => {
    await session.start()
    const instances = vi.mocked(AzureSession).mock.results.map((r) => r.value)
    await session.stop()
    expect(instances[0].stop).toHaveBeenCalled()
    expect(instances[1].stop).toHaveBeenCalled()
  })

  it('restarts both sessions', async () => {
    await session.start()
    const instances = vi.mocked(AzureSession).mock.results.map((r) => r.value)
    await session.restart()
    expect(instances[0].restart).toHaveBeenCalled()
    expect(instances[1].restart).toHaveBeenCalled()
  })

  it('setLanguage is a no-op in dual mode', async () => {
    await session.start()
    // Should not throw
    await expect(session.setLanguage('en-AU')).resolves.not.toThrow()
  })
})

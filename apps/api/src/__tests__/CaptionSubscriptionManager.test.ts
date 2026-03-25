import { describe, it, expect, beforeEach } from 'vitest'
import { CaptionSubscriptionManager } from '../services/CaptionSubscriptionManager'

describe('CaptionSubscriptionManager', () => {
  let mgr: CaptionSubscriptionManager

  beforeEach(() => {
    mgr = new CaptionSubscriptionManager()
  })

  it('tracks a subscription', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    const subs = mgr.getSubscribers('EVT1')
    expect(subs.get('mi')).toContain('socket-a')
  })

  it('unsubscribes a single socket from a language', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    mgr.subscribe('EVT1', 'mi', 'socket-b')
    mgr.unsubscribe('EVT1', 'mi', 'socket-a')
    expect(mgr.getSubscribers('EVT1').get('mi')).not.toContain('socket-a')
    expect(mgr.getSubscribers('EVT1').get('mi')).toContain('socket-b')
  })

  it('removes socket from all languages on disconnectAll', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    mgr.subscribe('EVT1', 'en', 'socket-a')
    mgr.subscribe('EVT2', 'zh-Hans', 'socket-a')
    mgr.disconnectAll('socket-a')
    expect(mgr.getSubscribers('EVT1').get('mi')).not.toContain('socket-a')
    expect(mgr.getSubscribers('EVT1').get('en')).not.toContain('socket-a')
    expect(mgr.getSubscribers('EVT2').get('zh-Hans')).not.toContain('socket-a')
  })

  it('returns empty map for unknown event', () => {
    expect(mgr.getSubscribers('UNKNOWN').size).toBe(0)
  })

  it('getLanguages returns languages with at least one subscriber', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    mgr.subscribe('EVT1', 'en', 'socket-b')
    mgr.subscribe('EVT1', 'sm', 'socket-c')
    const langs = mgr.getLanguages('EVT1')
    expect(langs).toEqual(new Set(['mi', 'en', 'sm']))
  })

  it('getLanguages excludes languages with zero subscribers after unsubscribe', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    mgr.subscribe('EVT1', 'en', 'socket-b')
    mgr.unsubscribe('EVT1', 'mi', 'socket-a')
    const langs = mgr.getLanguages('EVT1')
    expect(langs).toEqual(new Set(['en']))
  })

  it('getLanguages returns empty set for unknown event', () => {
    expect(mgr.getLanguages('UNKNOWN').size).toBe(0)
  })
})

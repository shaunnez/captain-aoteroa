/**
 * Tracks which socket IDs want audio for which language, per event.
 * Structure: eventCode → language → Set<socketId>
 */
export class AudioSubscriptionManager {
  // socketId → Set of "eventCode:language" keys, for efficient disconnectAll
  private socketIndex = new Map<string, Set<string>>()
  // eventCode → language → Set<socketId>
  private subs = new Map<string, Map<string, Set<string>>>()

  subscribe(eventCode: string, language: string, socketId: string): void {
    if (!this.subs.has(eventCode)) this.subs.set(eventCode, new Map())
    const langMap = this.subs.get(eventCode)!
    if (!langMap.has(language)) langMap.set(language, new Set())
    langMap.get(language)!.add(socketId)

    const key = `${eventCode}:${language}`
    if (!this.socketIndex.has(socketId)) this.socketIndex.set(socketId, new Set())
    this.socketIndex.get(socketId)!.add(key)
  }

  unsubscribe(eventCode: string, language: string, socketId: string): void {
    this.subs.get(eventCode)?.get(language)?.delete(socketId)
    this.socketIndex.get(socketId)?.delete(`${eventCode}:${language}`)
  }

  /** Remove a socket from all subscriptions — call on disconnect. */
  disconnectAll(socketId: string): void {
    const keys = this.socketIndex.get(socketId)
    if (!keys) return
    for (const key of keys) {
      const [eventCode, ...langParts] = key.split(':')
      const language = langParts.join(':') // handles codes like zh-Hans
      this.subs.get(eventCode)?.get(language)?.delete(socketId)
    }
    this.socketIndex.delete(socketId)
  }

  /** Returns language → Set<socketId> for the given event. Empty map if none. */
  getSubscribers(eventCode: string): Map<string, Set<string>> {
    return this.subs.get(eventCode) ?? new Map()
  }
}

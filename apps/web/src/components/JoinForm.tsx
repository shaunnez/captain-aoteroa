import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Event } from '@caption-aotearoa/shared'

export function JoinForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.get<Event>(`/api/events/${code.toUpperCase()}`)
      navigate(`/event/${code.toUpperCase()}`)
    } catch {
      setError('Event not found. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2 w-full max-w-md">
      <div className="relative w-full max-w-md group">
        <div className="absolute -inset-1 rainbow-glow rounded-xl group-focus-within:opacity-100 opacity-0 transition duration-500"></div>
        <div className="relative flex bg-surface-container-high rounded-xl p-1.5 border border-outline-variant/30">
          <input
            id="code"
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface px-4 font-headline tracking-widest uppercase placeholder:text-outline placeholder:normal-case placeholder:tracking-normal"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="Enter event code"
            maxLength={6}
            required
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button type="submit" disabled={loading || code.length !== 6} className="btn-accent px-6 py-3 rounded-lg">
            {loading ? 'Finding…' : 'Join Event'}
          </button>
        </div>
      </div>
      {error && <p className="text-error text-sm mt-2 text-center">{error}</p>}
    </form>
  )
}

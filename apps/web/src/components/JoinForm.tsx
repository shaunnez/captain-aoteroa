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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
          Event code
        </label>
        <input
          id="code"
          className="input-field text-2xl font-mono uppercase tracking-widest text-center"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="KAI492"
          maxLength={6}
          required
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>
      {error && (
        <p className="text-[var(--color-error)] text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="btn-primary disabled:opacity-50"
      >
        {loading ? 'Finding event…' : 'Join event'}
      </button>
    </form>
  )
}

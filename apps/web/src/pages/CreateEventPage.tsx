import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Event } from '@caption-aotearoa/shared'

export function CreateEventPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post<Event>('/api/events', {
        title,
        description: description || null,
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
      })
      navigate(`/present/${data.code}`)
    } catch {
      setError('Failed to create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="font-serif text-4xl font-semibold text-brand-purple-dark mb-8">
        New Event
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Event title *</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea className="input-field h-24 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block font-medium mb-1">Event date</label>
          <input type="datetime-local" className="input-field" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        {error && <p className="text-brand-error text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  )
}

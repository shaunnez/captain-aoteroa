import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Event } from '@caption-aotearoa/shared'

export function CreateEventPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [phraseList, setPhraseList] = useState('')
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
        phrase_list: phraseList.split(',').map((s) => s.trim()).filter(Boolean),
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
      <h1 className="font-headline text-4xl font-bold text-on-surface mb-8">
        New Event
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">Event title *</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">Description</label>
          <textarea className="input-field h-24 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label htmlFor="phraseList" className="block text-sm font-medium text-on-surface-variant mb-1">
            Custom phrases <span className="opacity-50">(optional)</span>
          </label>
          <div className="border border-tertiary-container/30 rounded-lg">
            <textarea
              id="phraseList"
              value={phraseList}
              onChange={(e) => setPhraseList(e.target.value)}
              className="input-field border-0"
              rows={2}
              placeholder="karakia, whakatau, kaiārahi — comma separated"
            />
          </div>
          <p className="text-xs text-secondary mt-1">
            Helps speech recognition with te reo Māori words, names, and event-specific terms.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">Event date</label>
          <input type="datetime-local" className="input-field" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-accent w-full">
          {loading ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  )
}

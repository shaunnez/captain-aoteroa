import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { DashboardShell } from '../components/DashboardShell'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Plus, LayoutList } from 'lucide-react'
import type { Event } from '@caption-aotearoa/shared'

export function CreateEventPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [phraseList, setPhraseList] = useState('')
  const [organiserName, setOrganiserName] = useState('')
  const [themeColor, setThemeColor] = useState('')
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
        event_date: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
        phrase_list: phraseList.split(',').map((s) => s.trim()).filter(Boolean),
        organiser_name: organiserName || null,
        theme_color: themeColor || null,
      })
      navigate(`/present/${data.code}`)
    } catch {
      setError('Failed to create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const inputClass = `w-full px-3 py-2 rounded-lg border border-[var(--color-outline-variant)]
    bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]
    placeholder:text-[var(--color-on-surface-variant)] placeholder:opacity-50
    focus:outline-none focus:border-[var(--color-primary)] transition-colors`

  return (
    <DashboardShell
      headerActions={
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-on-surface-variant)]
                     border border-[var(--color-outline-variant)] hover:text-[var(--color-on-surface)]
                     transition-colors rounded-xl"
        >
          <LogOut size={16} />
          Sign out
        </button>
      }
      left={
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
            Organiser
          </p>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                       text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors"
          >
            <LayoutList size={16} />
            Events
          </Link>
          <Link
            to="/create"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                       bg-[var(--color-primary-fixed)] text-[var(--color-on-surface)] transition-colors"
          >
            <Plus size={16} />
            Create Event
          </Link>
        </div>
      }
      main={
        <div className="h-full flex items-center justify-center">
        <div className="max-w-lg w-full">
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
            New Event
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Event title <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Description
              </label>
              <textarea
                className={`${inputClass} h-24 resize-none`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Organiser / speaker name
              </label>
              <input
                className={inputClass}
                value={organiserName}
                onChange={(e) => setOrganiserName(e.target.value)}
                placeholder="e.g. Te Pūtahi Kōrero"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Theme colour
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Default', value: '' },
                  { label: 'Tūī', value: '#1a5276' },
                  { label: 'Pōhutukawa', value: '#c0392b' },
                  { label: 'Kōwhai', value: '#d4a017' },
                  { label: 'Pounamu', value: '#1e8449' },
                  { label: 'Tohorā', value: '#2e4057' },
                  { label: 'Kōrari', value: '#7d3c98' },
                ].map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setThemeColor(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                      themeColor === c.value
                        ? 'border-[var(--color-primary)] shadow-sm'
                        : 'border-transparent'
                    }`}
                    style={{
                      background: c.value || 'var(--color-surface-container)',
                      color: c.value ? '#fff' : 'var(--color-on-surface)',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Custom phrases <span className="text-[var(--color-on-surface-variant)] font-normal">(optional)</span>
              </label>
              <textarea
                value={phraseList}
                onChange={(e) => setPhraseList(e.target.value)}
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="karakia, whakatau, kaiārahi — comma separated"
              />
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                Helps speech recognition with te reo Māori words, names, and event-specific terms.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Event date
              </label>
              <input
                type="datetime-local"
                className={`${inputClass} max-w-full`}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create event'}
            </button>
          </form>
        </div>
        </div>
      }
    />
  )
}

import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { DashboardShell } from '../components/DashboardShell'
import { EventCard } from '../components/EventCard'
import { LogOut, Plus, LayoutList } from 'lucide-react'
import { DarkModeToggle } from '../components/DarkModeToggle'
import type { Event } from '@caption-aotearoa/shared'

export function DashboardPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
    refetchInterval: 15_000,
  })

  const statusOrder = { live: 0, upcoming: 1, ended: 2 }
  const sorted = [...events].sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status]
    if (s !== 0) return s
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <DashboardShell
      headerActions={
        <>
          <DarkModeToggle />
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]
                       hover:text-[var(--color-on-surface)] transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </>
      }
      left={
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
            Organiser
          </p>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                       bg-[var(--color-primary-fixed)] text-[var(--color-on-surface)] transition-colors"
          >
            <LayoutList size={16} />
            Events
          </Link>
          <Link
            to="/create"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                       text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors"
          >
            <Plus size={16} />
            Create Event
          </Link>
        </div>
      }
      main={
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
            Your Events
          </h1>
          {isLoading ? (
            <p className="text-[var(--color-on-surface-variant)] text-center py-12">
              Loading events…
            </p>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[var(--color-on-surface-variant)] mb-4">No events yet.</p>
              <Link to="/create" className="btn-primary">
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  to={`/present/${event.code}`}
                />
              ))}
            </div>
          )}
        </div>
      }
    />
  )
}

import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { StatusBadge } from '../components/StatusBadge'
import { Tohu } from '../components/Tohu'
import type { Event } from '@caption-aotearoa/shared'
import { Plus, LogOut } from 'lucide-react'

export function DashboardPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
    refetchInterval: 15_000,
  })

  // Sort: live first, then upcoming by date, then ended
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
    <div className="min-h-screen">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link to="/create" className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus size={16} />
            New Event
          </Link>
          <button
            onClick={handleSignOut}
            className="text-white opacity-70 hover:opacity-100 transition-opacity"
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <Tohu pattern="koru-border" className="w-full h-6 opacity-30" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {isLoading ? (
          <p className="text-brand-purple opacity-60 text-center py-12">Loading events…</p>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-brand-black opacity-50 mb-4">No events yet.</p>
            <Link to="/create" className="btn-primary">
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(`/dashboard/events/${event.id}`)}
                className="w-full text-left bg-white rounded-xl p-5 border-2 border-brand-purple border-opacity-10 hover:border-opacity-30 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-semibold text-brand-purple-dark truncate">
                      {event.title}
                    </h3>
                    {event.event_date && (
                      <p className="text-sm text-brand-black opacity-60 mt-1">
                        {new Date(event.event_date).toLocaleDateString('en-NZ', {
                          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-purple border-opacity-10">
                  <span className="text-xs font-mono text-brand-purple opacity-60 tracking-wider">{event.code}</span>
                  <span className="text-xs text-brand-black opacity-50">{event.languages.length} languages</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

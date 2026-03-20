import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { JoinForm } from '../components/JoinForm'
import { EventCard } from '../components/EventCard'
import { EventSearchBar } from '../components/EventSearchBar'
import type { Event } from '@caption-aotearoa/shared'

export function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
    refetchInterval: 30_000,
  })

  // Filter and sort: live first, then upcoming, then ended
  const statusOrder = { live: 0, upcoming: 1, ended: 2 }
  const filtered = events
    .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  return (
    <div className="min-h-screen kowhaiwhai-pattern flex flex-col">
      {/* Fixed top nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface-container-lowest/95 border-b border-outline-variant/20 h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-koru.svg" alt="Caption Aotearoa logo" className="h-8 w-8" />
          <span className="font-headline font-bold text-on-surface">Caption Aotearoa</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-secondary hover:text-on-surface transition-colors"
        >
          Organiser? Sign in here
        </button>
      </nav>

      {/* Hero section */}
      <section className="pt-24 pb-16 px-8 text-center max-w-4xl mx-auto">
        <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight text-on-surface mb-6">
          Real-time captions for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">
            community events
          </span>{' '}
          across Aotearoa
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-12">
          No app needed — just scan the QR code or enter your event code to get
          real-time captions in your language.
        </p>
        <div className="flex justify-center">
          <JoinForm />
        </div>
      </section>

      {/* Event listing */}
      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="font-headline text-2xl font-bold text-on-surface whitespace-nowrap">
            Events
          </h2>
          <div className="flex-1 max-w-xs">
            <EventSearchBar value={search} onChange={setSearch} />
          </div>
        </div>

        {isLoading ? (
          <p className="text-secondary text-center py-8">Loading events…</p>
        ) : filtered.length === 0 ? (
          <p className="text-outline text-center py-8">
            {search ? 'No events match your search.' : 'No events yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-surface-container-lowest border-t border-outline-variant/20 py-8 px-6 text-center">
        <p className="text-outline text-xs">&copy; {new Date().getFullYear()} Caption Aotearoa</p>
      </footer>
    </div>
  )
}

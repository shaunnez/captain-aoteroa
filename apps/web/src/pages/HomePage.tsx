import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { JoinForm } from '../components/JoinForm'
import { EventCard } from '../components/EventCard'
import { EventSearchBar } from '../components/EventSearchBar'
import { Tohu } from '../components/Tohu'
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
    <div className="min-h-screen flex flex-col">
      {/* Hero section */}
      <section className="relative py-16 px-8 text-center">
        <Tohu pattern="koru-border" className="absolute top-0 left-0 w-full h-8 opacity-50" />
        <h1 className="font-serif text-5xl font-bold text-brand-purple-dark mb-4">
          Caption Aotearoa
        </h1>
        <p className="text-body text-brand-black opacity-80 max-w-lg mx-auto">
          Live captions for community events across Aotearoa New Zealand.
          No app needed — just scan the QR code or enter your event code.
        </p>
      </section>

      {/* Join by code */}
      <section className="px-8 pb-8 flex justify-center">
        <JoinForm />
      </section>

      <Tohu pattern="wave-divider" className="w-full" />

      {/* Event listing */}
      <section className="flex-1 px-8 py-8 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="font-serif text-2xl font-semibold text-brand-purple-dark whitespace-nowrap">
            Events
          </h2>
          <div className="flex-1 max-w-xs">
            <EventSearchBar value={search} onChange={setSearch} />
          </div>
        </div>

        {isLoading ? (
          <p className="text-brand-purple opacity-60 text-center py-8">Loading events…</p>
        ) : filtered.length === 0 ? (
          <p className="text-brand-black opacity-50 text-center py-8">
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
      <footer className="px-8 py-6 text-center">
        <Tohu pattern="koru-border" className="w-full h-6 opacity-30 mb-4" />
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-brand-purple underline underline-offset-4 hover:text-brand-purple-dark"
        >
          Organiser? Sign in here
        </button>
      </footer>
    </div>
  )
}

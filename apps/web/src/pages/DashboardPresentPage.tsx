import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PresentPage } from './PresentPage'
import type { Event } from '@caption-aotearoa/shared'
import { ArrowLeft } from 'lucide-react'

export function DashboardPresentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: events = [] } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
  })

  const event = events.find((e) => e.id === id)

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-brand-purple opacity-60">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-brand-navy text-white px-4 py-2 flex items-center gap-3">
        <button onClick={() => navigate(`/dashboard/events/${id}`)} className="text-white opacity-70 hover:opacity-100">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm opacity-70">Back to event detail</span>
      </div>
      <div className="flex-1">
        <PresentPage />
      </div>
    </div>
  )
}

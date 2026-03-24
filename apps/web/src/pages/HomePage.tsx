import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { api } from '../lib/api'
import { JoinForm } from '../components/JoinForm'
import { EventCard } from '../components/EventCard'
import { EventCardSkeleton } from '../components/EventCardSkeleton'
import { EventSearchBar } from '../components/EventSearchBar'
import { DarkModeToggle } from '../components/DarkModeToggle'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { AnimatedCounter } from '../components/AnimatedCounter'
import type { Event } from '@caption-aotearoa/shared'
import { LogoImg } from '../components/LogoImg'

const FEATURES = [
  { icon: 'verified', title: 'WCAG 2.1 AAA', body: 'Built to the highest accessibility standard from day one.' },
  { icon: 'bolt',     title: 'Sub-second latency', body: 'Captions appear before the sentence ends.' },
  { icon: 'translate', title: '25+ languages', body: 'Including te reo Māori and NZ census languages.' },
  { icon: 'wifi_off', title: 'No install needed', body: 'Scan a QR code or type a 6-character code. Done.' },
]

const heroVariants = {
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const heroChildVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', debouncedSearch],
    queryFn: () =>
      api
        .get<Event[]>('/api/events', { params: debouncedSearch ? { search: debouncedSearch } : undefined })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })

  const statusOrder = { live: 0, upcoming: 1, ended: 2 }
  const filtered = [...events].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 nav-glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <LogoImg className="h-9" />
            <span className="font-serif text-lg md:text-xl font-bold text-[var(--color-primary)]">
              HearMe NZ
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-md font-bold text-[var(--color-on-surface-variant)]">
            <a href="#events" className="hover:text-[var(--color-primary)] transition-colors">Events</a>
            <a href="#features" className="hover:text-[var(--color-primary)] transition-colors">About</a>
            <a href="#contact" className="hover:text-[var(--color-primary)] transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <button
              onClick={() => navigate('/login')}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              Organiser Login
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-6 text-center">
        <KowhaiwhaPattern />
        <motion.div
          className="relative max-w-2xl mx-auto"
          variants={heroVariants}
          initial={prefersReduced ? false : 'hidden'}
          animate="visible"
        >
          <motion.div variants={prefersReduced ? undefined : heroChildVariants}>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[var(--color-primary)] mb-6 leading-tight">
              Live captions for<br />Aotearoa
            </h1>
          </motion.div>

          <motion.div variants={prefersReduced ? undefined : heroChildVariants}>
            <p className="text-lg text-[var(--color-on-surface-variant)] mb-10 max-w-lg mx-auto">
              Real-time captions in 25+ languages — streamed to your audience's phones. No app, no account, just scan.
            </p>
          </motion.div>

          <motion.div
            className="flex justify-center"
            variants={prefersReduced ? undefined : heroChildVariants}
          >
            <JoinForm />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Events ── */}
      <section id="events" className="py-16 px-6 bg-[var(--color-surface-container-low)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <h2 className="font-serif text-3xl font-semibold text-[var(--color-on-surface)]">
              Upcoming events
            </h2>
            <div className="w-full max-w-xs">
              <EventSearchBar value={search} onChange={setSearch} />
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[var(--color-on-surface-variant)] text-center py-16">
              {search ? 'No events match your search.' : 'No events scheduled yet.'}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event, index) => (
                <motion.div
                  key={event.id}
                  className="h-full"
                  initial={prefersReduced ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' as const, delay: index * 0.05 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl font-semibold text-center text-[var(--color-on-surface)] mb-12">
            Built for accessibility
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, index) => (
              <motion.div
                key={f.icon}
                className="flex flex-col items-center text-center gap-3"
                initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-fixed)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px] text-[var(--color-primary)]">{f.icon}</span>
                </div>
                <h3 className="font-semibold text-[var(--color-on-surface)]">{f.title}</h3>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 bg-[var(--color-primary-container)]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center text-white">
          {/* 99.9% Accuracy */}
          <div>
            <p className="font-serif text-4xl font-bold">
              <AnimatedCounter target={99.9} suffix="%" />
            </p>
            <p className="text-sm mt-1 opacity-80">Accuracy</p>
          </div>

          {/* 85+ Increased engagement */}
          <div>
            <p className="font-serif text-4xl font-bold">
              <AnimatedCounter target={85} suffix="+" />
            </p>
            <p className="text-sm mt-1 opacity-80">Increased engagement</p>
          </div>

          {/* <1s Latency — fade-in only, no counter */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
          >
            <p className="font-serif text-4xl font-bold">&lt;1s</p>
            <p className="text-sm mt-1 opacity-80">Latency</p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="py-10 px-6 border-t border-[var(--color-outline-variant)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-on-surface-variant)]">
          <div className="flex items-center gap-2">
            <LogoImg className="h-7" />
            <span className="font-serif font-semibold text-[var(--color-primary)]">HearMe NZ</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Accessibility</a>
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

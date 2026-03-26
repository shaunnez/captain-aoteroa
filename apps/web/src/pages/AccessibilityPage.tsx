import { LogoImg } from '../components/LogoImg'
import { useNavigate } from 'react-router-dom'
import { DarkModeToggle } from '../components/DarkModeToggle'

export function AccessibilityPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 nav-glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <LogoImg className="h-9" />
            <span className="font-serif text-lg md:text-xl font-bold text-[var(--color-primary)]">
              HearMe NZ
            </span>
          </button>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[var(--color-primary)] mb-12">
            Accessibility
          </h1>

          {/* Our Purpose */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
              Our Purpose
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4 leading-relaxed">
              HearMe is built to make communication accessible for everyone.
            </p>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed">
              We help people understand and participate in conversations, presentations, and events in real time. Whether someone is Deaf or hard of hearing, speaks a different language, or benefits from clearer text, HearMe reduces barriers so people can fully engage.
            </p>
          </section>

          <div className="border-b border-[var(--color-outline-variant)] my-8"></div>

          {/* Designed for Inclusion */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
              Designed for Inclusion
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-6 leading-relaxed">
              Accessibility is a core part of how HearMe is designed and built.
            </p>
            <p className="text-[var(--color-on-surface-variant)] mb-6 leading-relaxed">
              We aim to align with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA where practical, and continuously improve based on real user feedback.
            </p>
            <p className="text-[var(--color-on-surface-variant)] mb-4 font-semibold">
              Key accessibility features include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[var(--color-on-surface-variant)]">
              <li>Real-time speech-to-text transcription</li>
              <li>Live translation across multiple languages, including te reo Māori</li>
              <li>Optional text-to-speech playback for translated content</li>
              <li>Adjustable font size and spacing for readability</li>
              <li>High contrast modes for visibility</li>
              <li>Support for dyslexia-friendly fonts</li>
              <li>Clear, simple interface with minimal cognitive load</li>
            </ul>
          </section>

          <div className="border-b border-[var(--color-outline-variant)] my-8"></div>

          {/* Supporting Aotearoa New Zealand */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
              Supporting Aotearoa New Zealand
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4 leading-relaxed">
              HearMe is designed with New Zealand in mind.
            </p>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed">
              We support te reo Māori alongside English and other commonly spoken languages across Aotearoa. The goal is to help communities communicate more effectively in workplaces, education, events, and public services.
            </p>
          </section>

          <div className="border-b border-[var(--color-outline-variant)] my-8"></div>

          {/* Real-Time Limitations */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
              Real-Time Limitations
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-6 leading-relaxed">
              While HearMe aims to be accurate and reliable, real-time transcription and translation may occasionally contain errors.
            </p>
            <p className="text-[var(--color-on-surface-variant)] mb-4 font-semibold">
              Accuracy can vary depending on:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[var(--color-on-surface-variant)] mb-6">
              <li>Background noise</li>
              <li>Speaker clarity and speed</li>
              <li>Accents and dialects</li>
              <li>Technical conditions such as internet quality</li>
            </ul>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed">
              HearMe should support communication, but it should not be relied on as a perfect or official record.
            </p>
          </section>

          <div className="border-b border-[var(--color-outline-variant)] my-8"></div>

          {/* Ongoing Improvements */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
              Ongoing Improvements
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4 leading-relaxed">
              Accessibility is not a one-time task.
            </p>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed">
              We are continuously improving the platform through testing, feedback, and iteration. If you encounter issues or have suggestions, we welcome your input.
            </p>
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-[var(--color-outline-variant)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-on-surface-variant)]">
          <div className="flex items-center gap-2">
            <LogoImg className="h-7" />
            <span className="font-serif font-semibold text-[var(--color-primary)]">HearMe NZ</span>
          </div>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-[var(--color-primary)] transition-colors">Privacy</a>
            <a href="/accessibility" className="hover:text-[var(--color-primary)] transition-colors">Accessibility</a>
            <a href="/contact" className="hover:text-[var(--color-primary)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

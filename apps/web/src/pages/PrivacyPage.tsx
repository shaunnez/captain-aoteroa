import { LogoImg } from '../components/LogoImg'
import { DarkModeToggle } from '../components/DarkModeToggle'
import { useNavigate } from 'react-router-dom'

export function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 nav-glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
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
        <div className="max-w-3xl mx-auto prose prose-invert">
          <h1 className="font-serif text-4xl font-bold text-[var(--color-on-surface)] mb-12">
            Privacy
          </h1>

          {/* Our Approach */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              Our Approach
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              We take privacy seriously and aim to follow the principles of the New Zealand Privacy Act 2020.
            </p>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              HearMe is designed to process live speech and provide real-time transcription and translation. We only collect and use information necessary to deliver this service.
            </p>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* What We Collect */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              What We Collect
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              Depending on how you use HearMe, we may process:
            </p>
            <ul className="list-disc list-inside text-[var(--color-on-surface-variant)] mb-4 space-y-1">
              <li>Audio input from presenters</li>
              <li>Transcribed text generated from speech</li>
              <li>Translated text outputs</li>
              <li>Basic account information for presenters (such as name and email)</li>
              <li>Event-related data (such as session identifiers or language selections)</li>
            </ul>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* How We Use Information */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              How We Use Information
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              We use this information to:
            </p>
            <ul className="list-disc list-inside text-[var(--color-on-surface-variant)] mb-4 space-y-1">
              <li>Provide real-time transcription and translation</li>
              <li>Deliver audio playback where selected</li>
              <li>Enable presenters to create and manage sessions</li>
              <li>Improve the performance and accuracy of the platform</li>
            </ul>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              We do not use your content for unrelated purposes.
            </p>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* Data Storage and Retention */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              Data Storage and Retention
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              HearMe is designed primarily as a real-time tool.
            </p>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              Where possible:
            </p>
            <ul className="list-disc list-inside text-[var(--color-on-surface-variant)] mb-4 space-y-1">
              <li>Audio is processed in real time and not permanently stored</li>
              <li>Transcripts and translations are not retained longer than necessary</li>
            </ul>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              Some limited data may be temporarily stored for system performance, debugging, or service improvement.
            </p>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* Third-Party Services */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              Third-Party Services
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              HearMe uses trusted third-party services to deliver speech recognition, translation, and hosting.
            </p>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              These providers may process data on our behalf. We take reasonable steps to ensure they follow appropriate security and privacy standards.
            </p>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              Security
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              We take reasonable technical and organisational measures to protect your data from loss, misuse, or unauthorised access.
            </p>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              However, no system can guarantee complete security, especially when transmitting data over the internet.
            </p>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* Your Responsibilities */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              Your Responsibilities
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              If you are hosting or presenting an event using HearMe:
            </p>
            <ul className="list-disc list-inside text-[var(--color-on-surface-variant)] mb-4 space-y-1">
              <li>You are responsible for informing participants that transcription and translation is taking place</li>
              <li>You should ensure you have appropriate consent where required</li>
            </ul>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              Your Rights
            </h2>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              Under the Privacy Act 2020, you have the right to:
            </p>
            <ul className="list-disc list-inside text-[var(--color-on-surface-variant)] mb-4 space-y-1">
              <li>Access personal information we hold about you</li>
              <li>Request correction of that information</li>
            </ul>
            <p className="text-[var(--color-on-surface-variant)] mb-4">
              If you have questions or requests, you can contact us.
            </p>
            <hr className="my-8 border-[var(--color-outline-variant)]" />
          </section>

          {/* Changes */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-4">
              Changes
            </h2>
            <p className="text-[var(--color-on-surface-variant)]">
              We may update this page as the platform evolves. Changes will be reflected here.
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

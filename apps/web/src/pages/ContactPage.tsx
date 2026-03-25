import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import { LogoImg } from '../components/LogoImg'
import { DarkModeToggle } from '../components/DarkModeToggle'

const SERVICE_ID  = 'service_5cy3o0k'
const TEMPLATE_ID = 'template_gr0cbsa'
const PUBLIC_KEY  = 'tDxf7rfkIWs8Cl8oN'

interface FormErrors { name?: string; email?: string; message?: string }

function validate(name: string, email: string, message: string): FormErrors {
  const errs: FormErrors = {}
  if (!name.trim() || name.trim().length < 2) errs.name = 'Name is required (min 2 characters)'
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email address required'
  if (!message.trim() || message.trim().length < 10) errs.message = 'Message is required (min 10 characters)'
  return errs
}

export function ContactPage() {
  const navigate = useNavigate()
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [message, setMessage]     = useState('')
  const [errors, setErrors]       = useState<FormErrors>({})
  const [loading, setLoading]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [sendError, setSendError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSendError('')
    const errs = validate(name, email, message)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, { from_name: name, from_email: email, message }, PUBLIC_KEY)
      setSent(true)
    } catch {
      setSendError('Failed to send message. Please try again or email uksn@me.com directly.')
    } finally {
      setLoading(false)
    }
  }

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
        <div className="max-w-xl mx-auto">
          <h1 className="font-serif text-4xl font-bold text-[var(--color-primary)] mb-12">
            Contact
          </h1>

          {sent ? (
            <div role="alert" className="rounded-xl bg-[var(--color-surface-container)] p-8 text-center">
              <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-3">
                Message sent
              </h2>
              <p className="text-[var(--color-on-surface-variant)]">
                Thanks for getting in touch. We&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                />
                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
              </div>

              {sendError && (
                <p role="alert" className="text-red-500 text-sm">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg bg-[var(--color-primary)] text-white font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity dark:bg-[#311b92] dark:text-white"
              >
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
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

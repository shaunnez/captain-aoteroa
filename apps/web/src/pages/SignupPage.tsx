import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { DarkModeToggle } from '../components/DarkModeToggle'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-8
                      bg-[var(--color-surface-container-low)] overflow-hidden">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1440 900"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,300 C360,200 720,400 1080,300 C1260,250 1380,320 1440,300 L1440,900 L0,900 Z"
            fill="#311b92"
            opacity="0.18"
          />
          <path
            d="M0,480 C400,380 800,560 1200,460 C1320,420 1400,480 1440,460 L1440,900 L0,900 Z"
            fill="#1c0070"
            opacity="0.10"
          />
        </svg>
        <div className="relative w-full max-w-sm rounded-xl border border-[var(--color-outline-variant)]
                        bg-[var(--color-surface)] shadow-xl overflow-hidden p-8 text-center">
          <KowhaiwhaPattern opacity={0.03} />
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-fixed)] flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[32px] text-[var(--color-primary)]">mark_email_read</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-[var(--color-primary)] mb-3">
              Check your email
            </h1>
            <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
              We've sent you a confirmation link. Click it to activate your account.
            </p>
            <Link
              to="/login"
              className="text-[var(--color-primary)] underline underline-offset-4 hover:opacity-80 text-sm"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-8
                    bg-[var(--color-surface-container-low)] overflow-hidden">
      {/* Wave background */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,300 C360,200 720,400 1080,300 C1260,250 1380,320 1440,300 L1440,900 L0,900 Z"
          fill="#311b92"
          opacity="0.18"
        />
        <path
          d="M0,480 C400,380 800,560 1200,460 C1320,420 1400,480 1440,460 L1440,900 L0,900 Z"
          fill="#1c0070"
          opacity="0.10"
        />
      </svg>

      {/* Dark mode toggle top-right */}
      <div className="absolute top-6 right-6">
        <DarkModeToggle />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-xl border border-[var(--color-outline-variant)]
                      bg-[var(--color-surface)] shadow-xl overflow-hidden p-8">
        <KowhaiwhaPattern opacity={0.03} />
        <div className="relative">
          {/* Brand */}
          <div className="text-center mb-8">
            <span className="font-serif text-2xl font-bold text-[var(--color-primary)]">
              Caption Aotearoa
            </span>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Create your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                 text-[20px] text-[var(--color-on-surface-variant)]">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                 text-[20px] text-[var(--color-on-surface-variant)]">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60 mt-1.5">
                Minimum 8 characters
              </p>
            </div>

            {error && (
              <p className="text-[var(--color-error)] text-sm">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <span>{loading ? 'Creating account…' : 'Sign up'}</span>
              {!loading && (
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <p className="text-sm text-center mt-6 text-[var(--color-on-surface-variant)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[var(--color-primary)] underline underline-offset-4 hover:opacity-80"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

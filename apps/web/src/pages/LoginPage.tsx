import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { DarkModeToggle } from '../components/DarkModeToggle'
import { Home } from 'lucide-react'
import { LogoImg } from '../components/LogoImg'

export function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
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
        <motion.path
          d="M0,300 C360,200 720,400 1080,300 C1260,250 1380,320 1440,300 L1440,900 L0,900 Z"
          fill="#311b92"
          opacity="0.18"
          animate={{ y: [0, -10, -6, -20, 0] }}
          transition={{ repeat: Infinity, duration: 6.5, ease: 'easeInOut' }}
        />
        <motion.path
          d="M0,480 C400,380 800,560 1200,460 C1320,420 1400,480 1440,460 L1440,900 L0,900 Z"
          fill="#1c0070"
          opacity="0.10"
          animate={{ y: [0, -8, -18, -4, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut', delay: 0.8 }}
        />
      </svg>

      {/* Top bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-md text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
        >
          <Home size={30} />
          Home
        </Link>
        <DarkModeToggle />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-xl border border-[var(--color-outline-variant)]
                      bg-[var(--color-surface)] shadow-xl overflow-hidden p-8">
        <KowhaiwhaPattern opacity={0.03} />
        <div className="relative">
          {/* Brand */}
          <div className="text-center mb-8">
            <LogoImg className="h-14 mx-auto mb-3" />
            <span className="font-serif text-2xl font-bold text-[var(--color-primary)]">
              HearMe NZ
            </span>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Organiser login
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
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-[var(--color-error)] text-sm">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              {!loading && (
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <p className="text-sm text-center mt-6 text-[var(--color-on-surface-variant)]">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-[var(--color-primary)] underline underline-offset-4 hover:opacity-80"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

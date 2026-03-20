import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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
      <div className="min-h-screen flex items-center justify-center p-8 kowhaiwhai-pattern">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-headline text-4xl font-bold text-on-surface mb-4">
            Check your email
          </h1>
          <p className="text-secondary mb-6">
            We've sent you a confirmation link. Click it to activate your account.
          </p>
          <Link to="/login" className="text-primary underline underline-offset-4">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 kowhaiwhai-pattern">
      <div className="w-full max-w-sm">
        <h1 className="font-headline text-4xl font-bold text-on-surface mb-8">
          Create Account
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-on-surface-variant mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-on-surface-variant mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-secondary mt-1">Minimum 8 characters</p>
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-accent w-full">
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="text-sm text-center mt-6 text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-primary underline underline-offset-4 hover:text-on-surface">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

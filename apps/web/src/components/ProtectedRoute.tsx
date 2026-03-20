import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-brand-purple text-lg">Loading…</p>
      </div>
    )
  }

  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

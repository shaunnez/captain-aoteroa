import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseAuth = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}))

import { ProtectedRoute } from '../components/ProtectedRoute'

function wrap(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders loading paragraph while loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: () => false, loading: true })
    wrap(
      <ProtectedRoute>
        <span>protected content</span>
      </ProtectedRoute>
    )
    expect(screen.getByText('Loading…')).toBeDefined()
    expect(screen.queryByText('protected content')).toBeNull()
  })

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: () => true, loading: false })
    wrap(
      <ProtectedRoute>
        <span>protected content</span>
      </ProtectedRoute>
    )
    expect(screen.getByText('protected content')).toBeDefined()
  })

  it('does not render children when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: () => false, loading: false })
    wrap(
      <ProtectedRoute>
        <span>protected content</span>
      </ProtectedRoute>
    )
    expect(screen.queryByText('protected content')).toBeNull()
  })
})

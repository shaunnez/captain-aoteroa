import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockUnsubscribe = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
  },
}))

import { useAuth } from '../hooks/useAuth'

const nullSessionResponse = { data: { session: null } }
const mockSession = {
  access_token: 'tok-abc',
  user: { id: 'user-1', email: 'a@b.com' },
}
const sessionResponse = { data: { session: mockSession } }

function setupDefaultMocks() {
  mockGetSession.mockResolvedValue(nullSessionResponse)
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } })
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('starts with loading true and no session', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.session).toBeNull()
    expect(result.current.user).toBeNull()
  })

  it('sets loading false and populates session after getSession resolves', async () => {
    mockGetSession.mockResolvedValue(sessionResponse)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBe(mockSession)
    expect(result.current.user).toBe(mockSession.user)
  })

  it('isAuthenticated returns false with null session, true with session', async () => {
    mockGetSession.mockResolvedValue(sessionResponse)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isAuthenticated()).toBe(true)

    mockGetSession.mockResolvedValue(nullSessionResponse)
    const { result: result2 } = renderHook(() => useAuth())
    await waitFor(() => expect(result2.current.loading).toBe(false))
    expect(result2.current.isAuthenticated()).toBe(false)
  })

  it('getToken returns null with no session, access_token string with session', async () => {
    mockGetSession.mockResolvedValue(sessionResponse)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.getToken()).toBe('tok-abc')

    mockGetSession.mockResolvedValue(nullSessionResponse)
    const { result: result2 } = renderHook(() => useAuth())
    await waitFor(() => expect(result2.current.loading).toBe(false))
    expect(result2.current.getToken()).toBeNull()
  })

  it('signIn calls supabase.auth.signInWithPassword and throws on error', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.signIn('a@b.com', 'wrong')).rejects.toMatchObject({ message: 'Invalid credentials' })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'wrong' })
  })

  it('unsubscribes from onAuthStateChange on unmount', async () => {
    const { unmount } = renderHook(() => useAuth())
    await waitFor(() => expect(mockGetSession).toHaveBeenCalled())
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})

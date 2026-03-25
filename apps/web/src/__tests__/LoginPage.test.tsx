import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockSignIn = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../components/KowhaiwhaPattern', () => ({
  KowhaiwhaPattern: () => null,
}))

vi.mock('../components/DarkModeToggle', () => ({
  DarkModeToggle: () => null,
}))

vi.mock('../components/LogoImg', () => ({
  LogoImg: () => null,
}))

import { LoginPage } from '../pages/LoginPage'

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email input, password input, and sign in button', () => {
    renderLoginPage()
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined()
  })

  it('calls signIn with email and password on submit', async () => {
    mockSignIn.mockResolvedValue(undefined)
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'secret123'))
  })

  it('displays error message when signIn throws', async () => {
    mockSignIn.mockRejectedValue({ message: 'Invalid login credentials' })
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('Incorrect email or password.')).toBeDefined())
  })

  it('navigates to /dashboard on successful sign in', async () => {
    mockSignIn.mockResolvedValue(undefined)
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })
})

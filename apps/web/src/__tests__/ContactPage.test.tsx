import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockNavigate, mockSend } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSend: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@emailjs/browser', () => ({ default: { send: mockSend } }))
vi.mock('../components/DarkModeToggle', () => ({ DarkModeToggle: () => null }))
vi.mock('../components/LogoImg', () => ({ LogoImg: () => null }))

import { ContactPage } from '../pages/ContactPage'

function renderContactPage() {
  return render(<MemoryRouter><ContactPage /></MemoryRouter>)
}

describe('ContactPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows 3 validation errors when submitted empty', () => {
    renderContactPage()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getByText(/name is required/i)).toBeDefined()
    expect(screen.getByText(/valid email address required/i)).toBeDefined()
    expect(screen.getByText(/message is required/i)).toBeDefined()
  })

  it('shows email error for invalid email format', () => {
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getByText(/valid email address required/i)).toBeDefined()
  })

  it('calls emailjs.send with correct params on valid submission', async () => {
    mockSend.mockResolvedValue({})
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(mockSend).toHaveBeenCalledOnce())
    expect(mockSend).toHaveBeenCalledWith(
      'service_5cy3o0k',
      'template_gr0cbsa',
      { from_name: 'Alice', from_email: 'alice@example.com', message: 'Hello this is a long enough message' },
      'tDxf7rfkIWs8Cl8oN'
    )
  })

  it('shows success message after successful send', async () => {
    mockSend.mockResolvedValue({})
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(screen.getByText(/message sent/i)).toBeDefined())
  })

  it('shows error message when send fails', async () => {
    mockSend.mockRejectedValue(new Error('network error'))
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(screen.getByText(/failed to send/i)).toBeDefined())
  })
})

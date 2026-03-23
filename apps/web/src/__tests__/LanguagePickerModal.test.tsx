import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguagePickerModal } from '../components/LanguagePickerModal'

describe('LanguagePickerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    selectedLocale: 'en',
    onSelect: vi.fn(),
  }

  it('renders nothing when isOpen is false', () => {
    render(<LanguagePickerModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Select Language')).toBeNull()
  })

  it('renders the modal when isOpen is true', () => {
    render(<LanguagePickerModal {...defaultProps} />)
    expect(screen.getByText('Select Language')).toBeDefined()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<LanguagePickerModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close language picker'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSelect with locale code when a language tile is clicked', () => {
    const onSelect = vi.fn()
    render(<LanguagePickerModal {...defaultProps} onSelect={onSelect} />)
    // "English" is always in NZ_LANGUAGES
    fireEvent.click(screen.getByText('English'))
    expect(onSelect).toHaveBeenCalledWith('en')
  })

  it('calls onClose after selecting a language', () => {
    const onClose = vi.fn()
    render(<LanguagePickerModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('English'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('filters tiles by search query', () => {
    render(<LanguagePickerModal {...defaultProps} />)
    const search = screen.getByPlaceholderText('Search for a language…')
    fireEvent.change(search, { target: { value: 'te reo' } })
    // Te reo Māori should still be visible (exact label casing from nzLanguages.ts)
    expect(screen.getByText('Te reo Māori')).toBeDefined()
    // English should be hidden
    expect(screen.queryByText('English')).toBeNull()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<LanguagePickerModal {...defaultProps} onClose={onClose} />)
    // The backdrop is the outermost fixed div
    fireEvent.click(container.querySelector('[data-backdrop]')!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaptionDisplay } from '../components/CaptionDisplay'
import type { DisplaySegment } from '../hooks/useCaptions'

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {}
})

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: any) => children,
}))

describe('CaptionDisplay', () => {
  const segments: DisplaySegment[] = [
    { sequence: 1, text: 'Hello world', isFinal: true, isTranslating: false, id: '1' },
    { sequence: 2, text: 'Testing captions', isFinal: false, isTranslating: false, id: '2' },
  ]

  it('renders segments', () => {
    render(<CaptionDisplay segments={segments} />)
    expect(screen.getByText('Hello world')).toBeDefined()
    expect(screen.getByText('Testing captions')).toBeDefined()
  })

  it('has role="log" for accessibility', () => {
    render(<CaptionDisplay segments={segments} />)
    expect(screen.getByRole('log')).toBeDefined()
  })

  it('has aria-live="polite"', () => {
    render(<CaptionDisplay segments={segments} />)
    const log = screen.getByRole('log')
    expect(log.getAttribute('aria-live')).toBe('polite')
  })

  it('shows translating spinner when isTranslating', () => {
    const translatingSegments: DisplaySegment[] = [
      { sequence: 1, text: 'Translating...', isFinal: true, isTranslating: true, id: '1' },
    ]
    render(<CaptionDisplay segments={translatingSegments} />)
    expect(screen.getByLabelText('Translating')).toBeDefined()
  })

  it('applies custom className', () => {
    render(<CaptionDisplay segments={[]} className="custom-class" />)
    const log = screen.getByRole('log')
    expect(log.className).toContain('custom-class')
  })

  it('applies custom style', () => {
    render(<CaptionDisplay segments={[]} style={{ fontSize: '2rem' }} />)
    const log = screen.getByRole('log')
    expect(log.style.fontSize).toBe('2rem')
  })
})

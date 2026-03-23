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

describe('CaptionDisplay variant="flat"', () => {
  const segments: DisplaySegment[] = [
    { sequence: 1, text: 'First segment', isFinal: true, isTranslating: false, id: '1' },
    { sequence: 2, text: 'Second segment', isFinal: true, isTranslating: false, id: '2' },
    { sequence: 3, text: 'Current segment', isFinal: false, isTranslating: false, id: '3' },
  ]

  it('still has role="log" and aria-live="polite"', () => {
    render(<CaptionDisplay segments={segments} variant="flat" />)
    const log = screen.getByRole('log')
    expect(log.getAttribute('aria-live')).toBe('polite')
  })

  it('does not render the rounded box container class', () => {
    render(<CaptionDisplay segments={segments} variant="flat" />)
    const log = screen.getByRole('log')
    expect(log.className).not.toContain('rounded-lg')
  })

  it('renders all segment texts', () => {
    render(<CaptionDisplay segments={segments} variant="flat" />)
    expect(screen.getByText('First segment')).toBeDefined()
    expect(screen.getByText('Second segment')).toBeDefined()
    expect(screen.getByText('Current segment')).toBeDefined()
  })

  it('applies faded style to all segments except the last', () => {
    const { container } = render(<CaptionDisplay segments={segments} variant="flat" />)
    const paras = container.querySelectorAll('p')
    expect(paras[0].className).toContain('opacity-20')
    expect(paras[1].className).toContain('opacity-20')
    expect(paras[2].className).not.toContain('opacity-20')
  })

  it('applies left-border accent to the last segment', () => {
    const { container } = render(<CaptionDisplay segments={segments} variant="flat" />)
    const paras = container.querySelectorAll('p')
    expect(paras[2].className).toContain('border-l-8')
  })

  it('with highContrast=true, faded segments are not faded', () => {
    const { container } = render(
      <CaptionDisplay segments={segments} variant="flat" highContrast={true} />
    )
    const paras = container.querySelectorAll('p')
    expect(paras[0].className).not.toContain('opacity-20')
    expect(paras[1].className).not.toContain('opacity-20')
  })

  it('with a single segment, that segment gets the active style', () => {
    const single: DisplaySegment[] = [
      { sequence: 1, text: 'Only segment', isFinal: true, isTranslating: false, id: '1' },
    ]
    const { container } = render(<CaptionDisplay segments={single} variant="flat" />)
    const para = container.querySelector('p')!
    expect(para.className).toContain('border-l-8')
    expect(para.className).not.toContain('opacity-20')
  })

  it('paragraph inherits font-size from parent style, not hardcoded tailwind sizes', () => {
    const seg: DisplaySegment[] = [
      { sequence: 1, text: 'Size test', isFinal: true, isTranslating: false, id: '1' },
    ]
    const { container } = render(
      <CaptionDisplay segments={seg} variant="flat" style={{ fontSize: '2rem' }} />
    )
    const para = container.querySelector('p')!
    // Must NOT have hardcoded responsive size classes
    expect(para.className).not.toContain('text-3xl')
    expect(para.className).not.toContain('text-5xl')
    expect(para.className).not.toContain('text-7xl')
    // Must use text-[1em] so it inherits the parent fontSize
    expect(para.className).toContain('text-[1em]')
  })
})

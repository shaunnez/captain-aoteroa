interface AccessibilityPanelProps {
  highContrast: boolean
  onToggleHighContrast: () => void
  dyslexiaFont: boolean
  onToggleDyslexiaFont: () => void
  lineSpacing?: 'compact' | 'normal' | 'relaxed'
  onSetLineSpacing?: (spacing: 'compact' | 'normal' | 'relaxed') => void
}

export function AccessibilityPanel({
  highContrast,
  onToggleHighContrast,
  dyslexiaFont,
  onToggleDyslexiaFont,
}: AccessibilityPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
        Accessibility
      </h3>

      {/* High Contrast toggle */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-[var(--color-on-surface)]">High contrast</span>
        <button
          role="switch"
          aria-checked={highContrast}
          onClick={onToggleHighContrast}
          className="relative inline-flex w-10 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface-container-low)]"
          style={{ background: highContrast ? 'var(--color-primary)' : 'var(--color-outline-variant)' }}
          aria-label="Toggle high contrast"
        >
          <span
            className="inline-block w-4 h-4 rounded-full bg-white shadow transition-all duration-200 self-center"
            style={{ transform: highContrast ? 'translateX(22px)' : 'translateX(4px)' }}
          />
        </button>
      </div>

      {/* Dyslexia Font toggle */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-[var(--color-on-surface)]">Dyslexia-friendly font</span>
        <button
          role="switch"
          aria-checked={dyslexiaFont}
          onClick={onToggleDyslexiaFont}
          className="relative inline-flex w-10 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface-container-low)]"
          style={{ background: dyslexiaFont ? 'var(--color-primary)' : 'var(--color-outline-variant)' }}
          aria-label="Toggle dyslexia-friendly font"
        >
          <span
            className="inline-block w-4 h-4 rounded-full bg-white shadow transition-all duration-200 self-center"
            style={{ transform: dyslexiaFont ? 'translateX(22px)' : 'translateX(4px)' }}
          />
        </button>
      </div>
    </div>
  )
}

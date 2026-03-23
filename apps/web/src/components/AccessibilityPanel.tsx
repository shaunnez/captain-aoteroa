interface AccessibilityPanelProps {
  highContrast: boolean
  onToggleHighContrast: () => void
  dyslexiaFont: boolean
  onToggleDyslexiaFont: () => void
  lineSpacing: 'compact' | 'normal' | 'relaxed'
  onSetLineSpacing: (spacing: 'compact' | 'normal' | 'relaxed') => void
}

export function AccessibilityPanel({
  highContrast,
  onToggleHighContrast,
  dyslexiaFont,
  onToggleDyslexiaFont,
  lineSpacing,
  onSetLineSpacing,
}: AccessibilityPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-3">
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

      {/* Line Spacing radio group */}
      <div>
        <span className="text-sm text-[var(--color-on-surface)] block mb-2">Line spacing</span>
        <div
          role="radiogroup"
          aria-label="Line spacing"
          className="grid grid-cols-3 gap-1"
        >
          {(['compact', 'normal', 'relaxed'] as const).map((option) => (
            <button
              key={option}
              role="radio"
              aria-checked={lineSpacing === option}
              onClick={() => onSetLineSpacing(option)}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors capitalize focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 ${
                lineSpacing === option
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface)]'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

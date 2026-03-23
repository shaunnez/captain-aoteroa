import { useState, useEffect } from 'react'

interface AccessibilityPrefs {
  fontSize: number     // rem value, range 1.25 to 3
  highContrast: boolean
  dyslexiaFont: boolean
  lineSpacing: 'compact' | 'normal' | 'relaxed'
}

const STORAGE_KEY = 'caption-a11y-prefs'
const DEFAULTS: AccessibilityPrefs = {
  fontSize: 1.5,
  highContrast: false,
  dyslexiaFont: false,
  lineSpacing: 'normal',
}

export function useAccessibility() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  const setFontSize = (fontSize: number) => setPrefs((p) => ({ ...p, fontSize }))
  const toggleHighContrast = () => setPrefs((p) => ({ ...p, highContrast: !p.highContrast }))
  const toggleDyslexiaFont = () => setPrefs((p) => ({ ...p, dyslexiaFont: !p.dyslexiaFont }))
  const setLineSpacing = (lineSpacing: 'compact' | 'normal' | 'relaxed') =>
    setPrefs((p) => ({ ...p, lineSpacing }))

  return { ...prefs, setFontSize, toggleHighContrast, toggleDyslexiaFont, setLineSpacing }
}

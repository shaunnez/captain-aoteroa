import { createContext, useContext, useEffect, useState } from 'react'

interface DarkModeContextValue {
  isDark: boolean
  toggle: () => void
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('caption-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('caption-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <DarkModeContext.Provider value={{ isDark, toggle: () => setIsDark((d) => !d) }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkModeContext() {
  const ctx = useContext(DarkModeContext)
  if (!ctx) throw new Error('useDarkModeContext must be used inside DarkModeProvider')
  return ctx
}

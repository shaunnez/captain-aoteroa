import { useDarkModeContext } from '../contexts/DarkModeContext'

export function DarkModeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useDarkModeContext()
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex items-center justify-center text-[var(--color-on-surface)] opacity-70 hover:opacity-100 transition-opacity ${className}`}
    >
      <span className="material-symbols-outlined text-[20px] leading-none">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}

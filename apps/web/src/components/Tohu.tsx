interface TohuProps {
  pattern: 'koru-border' | 'mangopare-corner' | 'wave-divider'
  className?: string
}

export function Tohu({ pattern, className = '' }: TohuProps) {
  return (
    <img
      src={`/tohu/${pattern}.svg`}
      alt=""
      role="presentation"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * Decorative Kowhaiwhai-inspired SVG pattern overlay.
 * Renders as an absolutely-positioned layer — parent must be `relative`.
 */
export function KowhaiwhaPattern({
  className = '',
  opacity = 0.04,
}: {
  className?: string
  opacity?: number
}) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="kowhaiwhai" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="20" fill="none" stroke="#311b92" strokeWidth="3" opacity={opacity} />
          <circle cx="30" cy="30" r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="0"  cy="0"  r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="60" cy="0"  r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="0"  cy="60" r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="60" cy="60" r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kowhaiwhai)" />
    </svg>
  )
}

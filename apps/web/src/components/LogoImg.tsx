import logoUrl from '../logo.svg'

interface LogoImgProps {
  className?: string
}

export function LogoImg({ className = 'h-8' }: LogoImgProps) {
  return (
    <div
      className={`logo-img shrink-0 ${className}`}
      style={{
        WebkitMaskImage: `url(${logoUrl})`,
        maskImage: `url(${logoUrl})`,
        aspectRatio: '2603 / 3300',
      }}
      aria-hidden="true"
    />
  )
}

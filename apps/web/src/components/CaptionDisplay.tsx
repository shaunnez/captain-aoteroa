import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { DisplaySegment } from '../hooks/useCaptions'

interface Props {
  segments: DisplaySegment[]
  className?: string
  style?: React.CSSProperties
  highContrast?: boolean
  variant?: 'box' | 'flat'
}

export function CaptionDisplay({ segments, className = '', style, highContrast = false, variant = 'box' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments])

  if (variant === 'flat') {
    return (
      <div
        className={`caption-area flex flex-col gap-10 ${className}`}
        role="log"
        aria-live="polite"
        aria-label="Live captions"
        style={style}
      >
        {segments.map((seg, index) => {
          const isLast = index === segments.length - 1
          const fadedClass = !isLast && !highContrast ? 'opacity-20' : ''
          const activeClass = isLast
            ? 'border-l-8 border-[var(--color-primary)] pl-10 transition-all duration-700 ease-out'
            : ''
          const italicClass = !seg.isFinal ? 'italic' : ''

          return (
            <motion.p
              key={`${seg.sequence}-${seg.isFinal}`}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`text-3xl md:text-5xl lg:text-7xl leading-[1.6] text-[var(--color-primary)] ${fadedClass} ${activeClass} ${italicClass}`.trim()}
            >
              <span>{seg.text}</span>
              {seg.isTranslating && (
                <span
                  className="inline-block w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin flex-shrink-0"
                  aria-label="Translating"
                />
              )}
            </motion.p>
          )
        })}
        <div ref={bottomRef} />
      </div>
    )
  }

  return (
    <div
      className={`overflow-y-auto rounded-lg p-6 space-y-2 ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Live captions"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#311b92 transparent', ...style }}
    >
      {segments.map((seg) => (
        <motion.p
          key={`${seg.sequence}-${seg.isFinal}`}
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`leading-relaxed transition-colors duration-200 flex items-center gap-2 ${
            seg.isFinal
              ? 'text-[var(--color-on-surface)]'
              : 'text-[var(--color-primary)] opacity-70 italic'
          }`}
        >
          <span>{seg.text}</span>
          {seg.isTranslating && (
            <span
              className="inline-block w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin flex-shrink-0"
              aria-label="Translating"
            />
          )}
        </motion.p>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

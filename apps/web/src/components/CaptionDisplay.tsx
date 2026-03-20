import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { DisplaySegment } from '../hooks/useCaptions'

interface Props {
  segments: DisplaySegment[]
  className?: string
  style?: React.CSSProperties
  highContrast?: boolean
}

export function CaptionDisplay({ segments, className = '', style, highContrast = false }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  // Auto-scroll to latest caption
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments])

  return (
    <div
      className={`overflow-y-auto rounded-lg p-6 space-y-4 ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Live captions"
      style={style}
    >
      {segments.map((seg, index) => (
        <motion.p
          key={`${seg.sequence}-${seg.isFinal}`}
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`font-headline text-2xl md:text-3xl leading-relaxed transition-colors duration-200 flex items-center gap-2 ${
            seg.isFinal
              ? highContrast ? 'text-white' : 'text-on-surface'
              : highContrast ? 'text-white opacity-70 italic' : 'text-on-surface-variant italic'
          }`}
        >
          <span>{seg.text}</span>
          {seg.isTranslating && (
            <span
              className="inline-block w-4 h-4 border-2 border-on-surface border-t-transparent rounded-full animate-spin flex-shrink-0"
              aria-label="Translating"
            />
          )}
          {index === segments.length - 1 && (
            <span className="inline-block w-1 h-8 bg-primary ml-2 animate-pulse align-middle" />
          )}
        </motion.p>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

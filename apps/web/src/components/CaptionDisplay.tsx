import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { DisplaySegment } from '../hooks/useCaptions'

interface Props {
  segments: DisplaySegment[]
  className?: string
  style?: React.CSSProperties
}

export function CaptionDisplay({ segments, className = '', style }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  // Auto-scroll to latest caption
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments])

  return (
    <div
      className={`overflow-y-auto rounded-lg p-6 space-y-2 ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Live captions"
      style={style}
    >
      {segments.map((seg) => (
        <motion.p
          key={`${seg.sequence}-${seg.isFinal}`}
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`leading-relaxed transition-colors duration-200 flex items-center gap-2 ${
            seg.isFinal
              ? 'text-brand-black'
              : 'text-brand-purple opacity-70 italic'
          }`}
        >
          <span>{seg.text}</span>
          {seg.isTranslating && (
            <span
              className="inline-block w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin flex-shrink-0"
              aria-label="Translating"
            />
          )}
        </motion.p>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

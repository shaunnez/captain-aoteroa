import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useDarkModeContext } from '../contexts/DarkModeContext'

interface HeroWordDriftProps {
  prefersReduced: boolean
}

type DriftWord = {
  text: string
  teal: boolean
  leftPct: number
  sizeRem: number
  duration: number
  delay: number
}

// TODO: the whakataukī below is a contemporary Māori composition, not a documented
// traditional proverb. Have it reviewed by a Māori language advisor before public launch.
const WHAKATAUAKI = 'Ko ngā kupu he ara — words are a pathway'

const WORDS: DriftWord[] = [
  { text: 'Kōrero',      teal: false, leftPct: 6,  sizeRem: 0.82, duration: 7,   delay: 0    },
  { text: 'Whakarongo',  teal: true,  leftPct: 22, sizeRem: 1.00, duration: 8.5, delay: 1.4  },
  { text: 'Māramatanga', teal: false, leftPct: 40, sizeRem: 0.72, duration: 6.5, delay: 0.8  },
  { text: 'Kite',        teal: true,  leftPct: 56, sizeRem: 0.90, duration: 9,   delay: 2.2  },
  { text: 'Aroha',       teal: false, leftPct: 70, sizeRem: 0.78, duration: 7.5, delay: 0.3  },
  { text: 'Rongo',       teal: true,  leftPct: 82, sizeRem: 0.82, duration: 8,   delay: 3.1  },
  { text: 'Mōhio',       teal: false, leftPct: 14, sizeRem: 0.70, duration: 9.5, delay: 4.2  },
  { text: 'Ngā Reo',     teal: true,  leftPct: 48, sizeRem: 0.92, duration: 7,   delay: 5.0  },
  { text: 'Tūhura',      teal: false, leftPct: 76, sizeRem: 0.68, duration: 8,   delay: 1.8  },
  { text: 'Mātauranga',  teal: true,  leftPct: 30, sizeRem: 0.75, duration: 10,  delay: 6.0  },
]

export function HeroWordDrift({ prefersReduced }: HeroWordDriftProps) {
  const { isDark } = useDarkModeContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const travelPx = containerHeight * 0.55
  const startY   = containerHeight + 8   // just below the container floor

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* ── Drifting words ── */}
      {!prefersReduced && containerHeight > 0 && WORDS.map((word) => {
        const color = isDark
          ? word.teal
            ? '#8ad3d7'
            : '#c7bfff'
          : word.teal
            ? 'var(--color-secondary)'
            : 'var(--color-primary)'

        const shadow = isDark
          ? word.teal
            ? '0 0 16px rgba(138,211,215,0.5)'
            : '0 0 16px rgba(199,191,255,0.5)'
          : undefined

        return (
          <motion.span
            key={word.text}
            style={{
              position: 'absolute',
              left: `${word.leftPct}%`,
              top: startY,
              fontSize: `${word.sizeRem}rem`,
              fontWeight: 700,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              color,
              textShadow: shadow,
            }}
            animate={{
              y:       [0, 0, -(travelPx * 0.6), -(travelPx * 0.8), -travelPx],
              opacity: [0, 1,  1,                  0,                  0],
            }}
            transition={{
              duration: word.duration,
              delay: word.delay,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              times: [0, 0.08, 0.60, 0.80, 1],
            }}
          >
            {word.text}
          </motion.span>
        )
      })}

      {/* ── Scan line ── */}
      {!prefersReduced && containerHeight > 0 && (
        <motion.div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: startY,
            height: '1.5px',
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(138,211,215,0.45) 50%, transparent)'
              : 'linear-gradient(90deg, transparent, rgba(20,105,109,0.5) 50%, transparent)',
          }}
          animate={{
            y:       [0, 0, -(travelPx * 0.6), -(travelPx * 0.8), -travelPx],
            opacity: [0, 1,  1,                  0,                  0],
          }}
          transition={{
            duration: 5,
            delay: 0,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
            times: [0, 0.05, 0.70, 0.88, 1],
          }}
        />
      )}

      {/* ── Whakataukī — always shown, not hidden under reduced motion ── */}
      <p
        lang="mi"
        aria-hidden="false"
        className="absolute bottom-3.5 left-0 right-0 text-center text-xs font-semibold italic tracking-wider z-[2]"
        style={{
          color: isDark ? '#8ad3d7' : 'var(--color-secondary)',
          opacity: 0.65,
          pointerEvents: 'none',
        }}
      >
        {WHAKATAUAKI}
      </p>
    </div>
  )
}
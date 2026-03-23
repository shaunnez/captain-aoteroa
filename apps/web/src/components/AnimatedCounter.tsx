import { useRef } from 'react'
import { useSpring, useTransform, useInView, useReducedMotion, motion } from 'framer-motion'

interface AnimatedCounterProps {
  target: number
  suffix?: string
  prefix?: string
}

export function AnimatedCounter({ target, suffix = '', prefix = '' }: AnimatedCounterProps) {
  const prefersReduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  const spring = useSpring(0, { damping: 30, stiffness: 100 })

  const display = useTransform(spring, (value: number) => {
    const decimals = Number.isInteger(target) ? 0 : 1
    return `${prefix}${value.toFixed(decimals)}${suffix}`
  })

  // Trigger the spring when the element is in view
  if (isInView) {
    spring.set(target)
  }

  if (prefersReduced) {
    const decimals = Number.isInteger(target) ? 0 : 1
    return (
      <span>
        {prefix}
        {target.toFixed(decimals)}
        {suffix}
      </span>
    )
  }

  return <motion.span ref={ref}>{display}</motion.span>
}

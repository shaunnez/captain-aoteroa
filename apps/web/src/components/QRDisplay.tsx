import { useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'react-qr-code'
import { X, QrCode } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface Props {
  eventCode: string
}

export function QRDisplay({ eventCode }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const audienceUrl = `${window.location.origin}/event/${eventCode}`
  const prefersReduced = useReducedMotion()

  return (
    <>
      <button
        onClick={() => setFullscreen(true)}
        className="btn-secondary flex items-center gap-2"
      >
        <QrCode size={18} />
        Show QR code
      </button>

      {createPortal(
        <AnimatePresence>
          {fullscreen && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 bg-[var(--color-background)] flex flex-col items-center justify-center z-50 p-12"
              onClick={() => setFullscreen(false)}
            >
              <button
                className="absolute top-6 right-6 text-[var(--color-on-surface)] hover:opacity-70 transition-opacity"
                aria-label="Close QR code"
              >
                <X size={32} />
              </button>
              <QRCode value={audienceUrl} size={280} fgColor="#493276" bgColor="#fdfdf0" />
              <p className="font-mono text-5xl font-bold text-[var(--color-on-surface)] mt-8 tracking-widest">
                {eventCode}
              </p>
              <p className="text-[var(--color-on-surface-variant)] mt-4 text-lg">
                Scan to join · Tap anywhere to close
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

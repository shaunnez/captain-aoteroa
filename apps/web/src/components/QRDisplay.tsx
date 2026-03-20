import { useState } from 'react'
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

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-12"
            onClick={() => setFullscreen(false)}
          >
            <div
              className="bg-surface-container-low rounded-2xl p-8 max-w-sm w-full text-center border border-outline-variant/20 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setFullscreen(false)}
                className="absolute top-4 right-4 text-secondary hover:text-on-surface"
                aria-label="Close QR code"
              >
                <X size={32} />
              </button>
              <QRCode value={audienceUrl} size={280} fgColor="#1f2020" bgColor="#ffffff" />
              <p className="font-headline text-4xl font-bold text-on-surface mt-6 tracking-widest">
                {eventCode}
              </p>
              <p className="text-secondary mt-2 text-sm">
                Scan to join
              </p>
              <p className="text-outline text-xs mt-4">
                Tap outside to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

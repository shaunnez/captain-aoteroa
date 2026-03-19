import { useState } from 'react'
import QRCode from 'react-qr-code'
import { X, QrCode } from 'lucide-react'

interface Props {
  eventCode: string
}

export function QRDisplay({ eventCode }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const audienceUrl = `${window.location.origin}/event/${eventCode}`

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 bg-brand-sand flex flex-col items-center justify-center z-50 p-12"
        onClick={() => setFullscreen(false)}
      >
        <button
          className="absolute top-6 right-6 text-brand-purple hover:text-brand-purple-dark"
          aria-label="Close QR code"
        >
          <X size={32} />
        </button>
        <QRCode value={audienceUrl} size={280} fgColor="#493276" bgColor="#fdfdf0" />
        <p className="font-mono text-5xl font-bold text-brand-purple mt-8 tracking-widest">
          {eventCode}
        </p>
        <p className="text-brand-purple opacity-60 mt-4 text-lg">
          Scan to join · Tap anywhere to close
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={() => setFullscreen(true)}
      className="btn-secondary flex items-center gap-2"
    >
      <QrCode size={18} />
      Show QR code
    </button>
  )
}

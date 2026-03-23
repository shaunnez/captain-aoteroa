import { Mic, Square } from 'lucide-react'

interface Props {
  isCapturing: boolean
  onStart: () => void
  onStop: () => void
  error: string | null
  disabled?: boolean
}

export function MicControl({ isCapturing, onStart, onStop, error, disabled }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 md:gap-4">
      <button
        onClick={isCapturing ? onStop : onStart}
        disabled={disabled}
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all
          shadow-lg text-white text-3xl
          ${isCapturing
            ? 'bg-[var(--color-error)] hover:opacity-90 animate-pulse'
            : 'bg-[var(--color-primary-container)] hover:opacity-90'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isCapturing ? 'Stop captioning' : 'Start captioning'}
      >
        {isCapturing ? <Square size={28} className="md:hidden" /> : <Mic size={28} className="md:hidden" />}
        {isCapturing ? <Square size={32} className="hidden md:block" /> : <Mic size={32} className="hidden md:block" />}
      </button>
      <p className="text-xs md:text-sm font-medium text-[var(--color-on-surface-variant)] text-center">
        {isCapturing ? 'Captioning live — tap to stop' : 'Tap to start captioning'}
      </p>
      {error && <p className="text-[var(--color-error)] text-sm">{error}</p>}
    </div>
  )
}

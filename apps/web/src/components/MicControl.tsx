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
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isCapturing ? onStop : onStart}
        disabled={disabled}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all
          shadow-lg text-white text-3xl
          ${isCapturing
            ? 'bg-brand-error hover:bg-red-800 animate-pulse'
            : 'bg-brand-purple hover:bg-brand-purple-dark'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isCapturing ? 'Stop captioning' : 'Start captioning'}
      >
        {isCapturing ? <Square size={32} /> : <Mic size={32} />}
      </button>
      <p className="text-sm font-medium text-brand-purple">
        {isCapturing ? 'Captioning live — tap to stop' : 'Tap to start captioning'}
      </p>
      {error && <p className="text-brand-error text-sm">{error}</p>}
    </div>
  )
}

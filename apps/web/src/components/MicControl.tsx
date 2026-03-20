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
      {isCapturing && (
        <div className="w-24 h-1 rainbow-indicator rounded-full mb-2" />
      )}
      <button
        onClick={isCapturing ? onStop : onStart}
        disabled={disabled}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg text-3xl
          ${isCapturing
            ? 'bg-error-container border-2 border-error text-error hover:bg-error-container/80 animate-pulse'
            : 'bg-surface-container-high border-2 border-outline-variant text-primary hover:border-primary hover:bg-surface-container-highest'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isCapturing ? 'Stop captioning' : 'Start captioning'}
      >
        {isCapturing ? <Square size={32} /> : <Mic size={32} />}
      </button>
      <p className="text-sm font-medium text-secondary">
        {isCapturing ? 'Captioning live — tap to stop' : 'Tap to start captioning'}
      </p>
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  )
}

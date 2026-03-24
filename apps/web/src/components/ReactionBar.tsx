interface ReactionBarProps {
  onReact: (emoji: string) => void
}

const EMOJIS = ['👍', '👏', '❤️', '💯']

export function ReactionBar({ onReact }: ReactionBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg
                     bg-[var(--color-surface-container-high)]
                     border border-[var(--color-outline-variant)]
                     hover:scale-110 active:scale-95
                     transition-transform duration-150"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

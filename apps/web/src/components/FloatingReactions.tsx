import type { FloatingReaction } from '../hooks/useReactions'

interface FloatingReactionsProps {
  reactions: FloatingReaction[]
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="absolute text-2xl animate-float-up"
          style={{ left: `${r.x}%`, bottom: 0 }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  )
}

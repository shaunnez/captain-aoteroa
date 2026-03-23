import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Pin, X } from 'lucide-react'
import type { QaQuestion } from '@caption-aotearoa/shared'
import { useQA } from '../hooks/useQA'

interface QAPanelProps {
  code: string
}

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return `${diffSecs}s ago`
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h ago`
}

interface QuestionCardProps {
  question: QaQuestion
  onPin: () => void
  onDismiss: () => void
  isPinned?: boolean
}

function QuestionCard({ question, onPin, onDismiss, isPinned }: QuestionCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        isPinned
          ? 'border-[var(--color-primary-container)] bg-[var(--color-primary-fixed)]'
          : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]'
      }`}
    >
      <p className="text-sm text-[var(--color-on-surface)] leading-snug mb-2">
        {question.body}
      </p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full
                           bg-[var(--color-surface-container-high)]
                           text-[var(--color-on-surface-variant)]">
            {question.language}
          </span>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {relativeTime(question.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onPin}
            aria-label={isPinned ? 'Unpin question' : 'Pin question'}
            title={isPinned ? 'Unpin' : 'Pin'}
            className={`p-1.5 rounded-lg transition-colors ${
              isPinned
                ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]'
                : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
            }`}
          >
            <Pin size={14} />
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss question"
            title="Dismiss"
            className="p-1.5 rounded-lg transition-colors
                       text-[var(--color-on-surface-variant)]
                       hover:bg-[var(--color-surface-container-high)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function QAPanel({ code }: QAPanelProps) {
  const { pinnedQuestions, pendingQuestions, moderateQuestion } = useQA(code)
  const prefersReduced = useReducedMotion()

  const totalPending = pendingQuestions.length

  const cardVariants = {
    initial: { opacity: 0, y: -8, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  }
  const reducedVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  }
  const variants = prefersReduced ? reducedVariants : cardVariants

  return (
    <div className="rounded-xl border border-[var(--color-outline-variant)]
                    bg-[var(--color-surface-container-low)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-on-surface)]">
          Audience Questions
        </h3>
        {totalPending > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full
                           bg-[var(--color-primary)] text-[var(--color-on-primary)]">
            {totalPending}
          </span>
        )}
      </div>

      {/* Scrollable list */}
      <div className="space-y-2 pr-0.5">
        <AnimatePresence initial={false}>
          {pinnedQuestions.length === 0 && pendingQuestions.length === 0 && (
            <motion.p
              key="empty"
              {...variants}
              transition={{ duration: 0.2 }}
              className="text-sm text-[var(--color-on-surface-variant)] text-center py-8"
            >
              No questions yet
            </motion.p>
          )}

          {/* Pinned questions */}
          {pinnedQuestions.map((q) => (
            <motion.div
              key={q.id}
              layout
              {...variants}
              transition={prefersReduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
            >
              <QuestionCard
                question={q}
                isPinned
                onPin={() => moderateQuestion(q.id, 'pinned')}
                onDismiss={() => moderateQuestion(q.id, 'dismissed')}
              />
            </motion.div>
          ))}

          {/* Pending questions */}
          {pendingQuestions.map((q) => (
            <motion.div
              key={q.id}
              layout
              {...variants}
              transition={prefersReduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
            >
              <QuestionCard
                question={q}
                onPin={() => moderateQuestion(q.id, 'pinned')}
                onDismiss={() => moderateQuestion(q.id, 'dismissed')}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

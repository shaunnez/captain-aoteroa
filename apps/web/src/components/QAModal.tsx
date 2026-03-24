import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Pin, X } from 'lucide-react'
import type { QaQuestion } from '@caption-aotearoa/shared'
import { useQA } from '../hooks/useQA'

interface QAModalProps {
  isOpen: boolean
  onClose: () => void
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
            className={`p-2 rounded-lg transition-colors ${
              isPinned
                ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]'
                : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
            }`}
          >
            <Pin size={18} />
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss question"
            title="Dismiss"
            className="p-2 rounded-lg transition-colors
                       text-[var(--color-on-surface-variant)]
                       hover:bg-[var(--color-surface-container-high)]"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function QAModal({ isOpen, onClose, code }: QAModalProps) {
  const { pinnedQuestions, pendingQuestions, moderateQuestion } = useQA(code)
  const prefersReduced = useReducedMotion()

  const totalQuestions = pinnedQuestions.length + pendingQuestions.length

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface-container-lowest)] rounded-b-2xl sm:rounded-2xl shadow-2xl
                   w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[75vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Audience Questions"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-outline-variant)] shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--color-on-surface)]">
              Audience Questions
            </h2>
            {totalQuestions > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full
                               bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                {totalQuestions}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close Q&A"
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-container-high)] transition-colors
                       text-[var(--color-on-surface-variant)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable question list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          <AnimatePresence initial={false}>
            {pinnedQuestions.length === 0 && pendingQuestions.length === 0 && (
              <motion.p
                key="empty"
                {...variants}
                transition={{ duration: 0.2 }}
                className="text-sm text-[var(--color-on-surface-variant)] text-center py-12"
              >
                No questions yet
              </motion.p>
            )}

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
                  onPin={() => moderateQuestion(q.id, 'pending')}
                  onDismiss={() => moderateQuestion(q.id, 'dismissed')}
                />
              </motion.div>
            ))}

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
    </div>
  )
}

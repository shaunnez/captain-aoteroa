import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Send, X } from 'lucide-react'

interface AskQuestionDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (body: string, language: string) => void
  language: string
}

const MAX_LENGTH = 280
const QUICK_EMOJIS = ['👍', '❤️', '😮', '😂', '🎉', '👏']

export function AskQuestionDrawer({ isOpen, onClose, onSubmit, language }: AskQuestionDrawerProps) {
  const [body, setBody] = useState('')
  const prefersReduced = useReducedMotion()

  const trimmed = body.trim()
  const isOver = body.length > MAX_LENGTH
  const isEmpty = trimmed.length === 0
  const isDisabled = isEmpty || isOver

  function handleSubmit() {
    if (isDisabled) return
    onSubmit(trimmed, language)
    setBody('')
    onClose()
  }

  function handleKeyDown(e: { key: string; metaKey: boolean; ctrlKey: boolean }) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  const reducedDuration = { duration: 0 }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReduced ? reducedDuration : { duration: 0.2 }}
          />

          {/* Drawer */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Ask a question"
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto
                       bg-[var(--color-surface-container)] rounded-t-2xl p-6
                       shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={
              prefersReduced
                ? reducedDuration
                : { type: 'spring', damping: 30, stiffness: 350 }
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">
                Ask a question
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1 rounded-lg transition-colors
                           text-[var(--color-on-surface-variant)]
                           hover:bg-[var(--color-surface-container-high)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick emoji reactions */}
            <div className="flex gap-2 mb-3">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setBody((prev) => prev + emoji)}
                  className="text-xl leading-none p-1.5 rounded-lg
                             hover:bg-[var(--color-surface-container-high)] transition-colors"
                  aria-label={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question…"
              rows={4}
              className="w-full resize-none rounded-xl border px-4 py-3 text-base
                         bg-[var(--color-surface-container-low)]
                         border-[var(--color-outline-variant)]
                         text-[var(--color-on-surface)]
                         placeholder:text-[var(--color-on-surface-variant)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                         transition-colors"
              autoFocus
            />

            {/* Footer: char count + submit */}
            <div className="mt-3 flex items-center justify-between gap-4">
              <span
                className={`text-xs tabular-nums ${
                  isOver
                    ? 'text-[var(--color-error)]'
                    : 'text-[var(--color-on-surface-variant)]'
                }`}
              >
                {body.length} / {MAX_LENGTH}
              </span>

              <button
                onClick={handleSubmit}
                disabled={isDisabled}
                aria-label="Send question"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                           transition-colors
                           bg-[var(--color-primary)] text-[var(--color-on-primary)]
                           hover:opacity-90
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

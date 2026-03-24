import { useState, useCallback } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

interface DashboardShellProps {
  left: React.ReactNode
  main: React.ReactNode
  right?: React.ReactNode
  headerActions?: React.ReactNode
  /** When true, the main area is overflow-hidden flex-col so children can fill available height */
  fillMain?: boolean
}

export function DashboardShell({ left, main, right, headerActions, fillMain }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const prefersReduced = useReducedMotion()

  const reducedDuration = { duration: 0 }

  return (
    <div className={`${fillMain ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-[var(--color-background)]`}>
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-[var(--color-outline-variant)]
                         bg-[var(--color-surface-container-low)]
                         flex items-center justify-between px-4 lg:px-6 gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg
                       text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarOpen ? 'close' : 'menu'}
            </span>
          </button>
          <span className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
            HearMe NZ
          </span>
        </div>
        {headerActions && (
          <div className="flex items-center gap-3">
            {headerActions}
          </div>
        )}
      </header>

      {/* Body */}
      <div className={`flex flex-1 overflow-hidden`}>
        {/* Sidebar backdrop (mobile) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="lg:hidden fixed inset-0 z-30 bg-black/40"
              onClick={closeSidebar}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={prefersReduced ? reducedDuration : { duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Left sidebar — slide-over on mobile, static on lg+ */}
        <AnimatePresence>
          {sidebarOpen ? (
            <motion.aside
              key="mobile-sidebar"
              className="fixed lg:hidden inset-y-0 left-0 z-40 w-72 shrink-0 flex flex-col gap-6
                        bg-[var(--color-surface-container-low)]
                        border-r border-[var(--color-outline-variant)]
                        p-5 overflow-y-auto"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={prefersReduced ? reducedDuration : { type: 'spring', damping: 25, stiffness: 300 }}
            >
              {left}
            </motion.aside>
          ) : null}
        </AnimatePresence>

        {/* Left sidebar — static on lg+ (always visible) */}
        <aside className="hidden lg:flex static inset-y-0 left-0 z-40 w-72 shrink-0 flex-col gap-6
                          bg-[var(--color-surface-container-low)]
                          border-r border-[var(--color-outline-variant)]
                          p-5 overflow-y-auto">
          {left}
        </aside>

        {/* Main content */}
        <main className={`flex-1 p-4 md:p-6 lg:p-8 ${fillMain ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {main}
        </main>

        {/* Right panel — hidden below xl */}
        {right && (
          <aside className="hidden xl:flex w-72 shrink-0 flex-col gap-6
                            bg-[var(--color-surface-container-low)]
                            border-l border-[var(--color-outline-variant)]
                            p-5 overflow-y-auto">
            {right}
          </aside>
        )}
      </div>
    </div>
  )
}

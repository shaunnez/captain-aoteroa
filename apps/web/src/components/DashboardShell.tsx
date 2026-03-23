interface DashboardShellProps {
  left: React.ReactNode
  main: React.ReactNode
  right?: React.ReactNode
  headerActions?: React.ReactNode
  /** When true, the main area is overflow-hidden flex-col so children can fill available height */
  fillMain?: boolean
}

export function DashboardShell({ left, main, right, headerActions, fillMain }: DashboardShellProps) {
  return (
    <div className={`${fillMain ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-[var(--color-background)]`}>
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-[var(--color-outline-variant)]
                         bg-[var(--color-surface-container-low)]
                         flex items-center justify-between px-6 gap-4">
        <span className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
          Caption Aotearoa
        </span>
        {headerActions && (
          <div className="flex items-center gap-3">
            {headerActions}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — hidden below lg */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-6
                          bg-[var(--color-surface-container-low)]
                          border-r border-[var(--color-outline-variant)]
                          p-5 overflow-y-auto">
          {left}
        </aside>

        {/* Main content */}
        <main className={`flex-1 p-6 lg:p-8 ${fillMain ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
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

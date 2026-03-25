import { vi } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    path: ({ children, ...props }: any) => <path {...props}>{children}</path>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: any) => children,
}))

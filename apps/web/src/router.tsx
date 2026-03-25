import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { HomePage } from './pages/HomePage'
import { EventPage } from './pages/EventPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { PresentPage } from './pages/PresentPage'
import { DashboardPage } from './pages/DashboardPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function AnimatedRoutes() {
  const location = useLocation()
  const prefersReduced = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ minHeight: '100vh' }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/event/:code" element={<EventPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/create" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
          <Route path="/present/:code" element={<ProtectedRoute><PresentPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export function AppRouter() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </DarkModeProvider>
  )
}

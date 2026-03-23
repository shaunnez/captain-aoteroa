import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { HomePage } from './pages/HomePage'
import { EventPage } from './pages/EventPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { PresentPage } from './pages/PresentPage'
import { DashboardPage } from './pages/DashboardPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { DashboardPresentPage } from './pages/DashboardPresentPage'
import { ProtectedRoute } from './components/ProtectedRoute'

export function AppRouter() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:code" element={<EventPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/create" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
        <Route path="/present/:code" element={<ProtectedRoute><PresentPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:id/present" element={<ProtectedRoute><DashboardPresentPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </DarkModeProvider>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { EventPage } from './pages/EventPage'
import { OrganiserLoginPage } from './pages/OrganiserLoginPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { PresentPage } from './pages/PresentPage'
import { ProtectedRoute } from './components/ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:code" element={<EventPage />} />
        <Route path="/organiser-login" element={<OrganiserLoginPage />} />
        <Route path="/create" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
        <Route path="/present/:code" element={<ProtectedRoute><PresentPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

import { JoinForm } from '../components/JoinForm'
import { useNavigate } from 'react-router-dom'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-12">
      <div className="text-center max-w-lg">
        <h1 className="font-serif text-5xl font-bold text-brand-purple-dark mb-4">
          Caption Aotearoa
        </h1>
        <p className="text-body text-brand-black opacity-80">
          Live captions for community events across Aotearoa New Zealand.
          No app needed — just scan the QR code or enter your event code.
        </p>
      </div>

      <JoinForm />

      <button
        onClick={() => navigate('/organiser-login')}
        className="text-sm text-brand-purple underline underline-offset-4 hover:text-brand-purple-dark"
      >
        Organiser? Sign in here
      </button>
    </div>
  )
}

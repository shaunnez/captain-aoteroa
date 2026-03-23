import { useState } from 'react'
import { api } from '../lib/api'
import { Download, Loader2 } from 'lucide-react'
import { LanguagePickerModal } from './LanguagePickerModal'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import type { NzLanguage } from '@caption-aotearoa/shared/nzLanguages'

interface TranscriptLanguage {
  language: string
  content: string
}

interface TranscriptResponse {
  status: string
  generated_at?: string
  languages: TranscriptLanguage[]
}

interface TranscriptDownloadProps {
  eventCode: string
  eventTitle: string
  eventDate?: string | null
}

export function TranscriptDownload({ eventCode, eventTitle, eventDate }: TranscriptDownloadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null)
  const [selectedLang, setSelectedLang] = useState<string>('')
  const [langPickerOpen, setLangPickerOpen] = useState(false)

  async function fetchTranscript() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get<TranscriptResponse>(`/api/events/${eventCode}/transcript`)
      setTranscript(data)
      if (data.languages.length > 0 && !selectedLang) {
        setSelectedLang(data.languages[0].language)
      }
    } catch {
      setError('Failed to load transcript')
    } finally {
      setLoading(false)
    }
  }

  async function downloadPDF() {
    if (!transcript) return

    const langData = transcript.languages.find((l) => l.language === selectedLang)
    if (!langData) return

    // Dynamic import to avoid bundling jsPDF on every page
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
    let y = margin

    // Title
    doc.setFontSize(18)
    doc.text(eventTitle, margin, y)
    y += 10

    // Date
    if (eventDate) {
      doc.setFontSize(10)
      doc.setTextColor(128)
      doc.text(new Date(eventDate).toLocaleDateString('en-NZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }), margin, y)
      y += 8
    }

    // Language label
    doc.setFontSize(10)
    doc.setTextColor(128)
    doc.text(`Language: ${selectedLang}`, margin, y)
    y += 12

    // Content
    doc.setFontSize(11)
    doc.setTextColor(0)
    const lines = doc.splitTextToSize(langData.content, pageWidth)

    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 6
    }

    doc.save(`${eventTitle.replace(/[^a-zA-Z0-9]/g, '-')}-transcript-${selectedLang}.pdf`)
  }

  // Initial state — show fetch button
  if (!transcript) {
    return (
      <div>
        <button
          onClick={fetchTranscript}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? 'Loading…' : 'View Transcript'}
        </button>
        {error && <p className="text-[var(--color-error)] text-sm mt-2">{error}</p>}
      </div>
    )
  }

  // Transcript not ready
  if (transcript.status !== 'ready') {
    return (
      <div className="text-sm">
        <p className="text-[var(--color-on-surface-variant)]">
          Transcript status: <span className="font-medium">{transcript.status}</span>
        </p>
        {transcript.status === 'processing' && (
          <p className="text-[var(--color-primary)] text-xs mt-1">Processing — check back shortly.</p>
        )}
        {transcript.status === 'failed' && (
          <p className="text-brand-error text-xs mt-1">Processing failed. An organiser can retry from the dashboard.</p>
        )}
      </div>
    )
  }

  // Transcript ready — show language picker and download
  const transcriptLangs: NzLanguage[] = transcript.languages.map((l) => {
    const found = NZ_LANGUAGES.find((n) => n.code === l.language)
    return found ?? { code: l.language, label: l.language }
  })

  const activeLang = transcriptLangs.find((l) => l.code === selectedLang)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => setLangPickerOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                   bg-[var(--color-surface-container-high)]
                   text-[var(--color-on-surface)]
                   border border-[var(--color-outline-variant)]
                   hover:bg-[var(--color-surface-container-highest)] transition-colors"
      >
        {activeLang?.flag && (
          <span className="text-base leading-none">{activeLang.flag}</span>
        )}
        <span>{activeLang?.label ?? selectedLang}</span>
        <svg className="w-3 h-3 opacity-60 shrink-0" viewBox="0 0 12 12" fill="none">
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={downloadPDF}
        className="btn-primary flex items-center gap-2 text-sm py-1.5"
      >
        <Download className="w-4 h-4" />
        Download PDF
      </button>
      <LanguagePickerModal
        isOpen={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
        selectedLocale={selectedLang}
        onSelect={(code) => { setSelectedLang(code); setLangPickerOpen(false) }}
        languages={transcriptLangs}
      />
    </div>
  )
}

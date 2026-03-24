import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { NZ_LANGUAGES, type NzLanguage, TTS_SUPPORTED_LANGUAGES } from '@caption-aotearoa/shared'
import { AZURE_TRANSLATION_LANGUAGES } from '@caption-aotearoa/shared/azureLanguages'

interface LanguagePickerModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocale: string
  onSelect: (locale: string) => void
  languages?: NzLanguage[]   // when provided: show only these, hide Translated section
  showAudioIndicator?: boolean  // show "no audio" badge for languages without TTS
}

const NZ_CODES = new Set(NZ_LANGUAGES.map((l) => l.code))

export function LanguagePickerModal({ isOpen, onClose, selectedLocale, onSelect, languages, showAudioIndicator }: LanguagePickerModalProps) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const query = search.toLowerCase()

  const instantItems = (languages ?? NZ_LANGUAGES).filter((l) =>
    l.label.toLowerCase().includes(query)
  )

  const translatedItems = languages
    ? []   // custom list — no translated section
    : AZURE_TRANSLATION_LANGUAGES.filter(
        (l) => !NZ_CODES.has(l.code) && l.label.toLowerCase().includes(query)
      )

  function handleSelect(code: string) {
    onSelect(code)
    onClose()
  }

  return (
    <div
      data-backdrop
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface-container-lowest)] rounded-2xl shadow-2xl
                   w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Language"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-outline-variant)] shrink-0">
          <h2 className="text-xl font-semibold text-[var(--color-on-surface)]">
            Select Language
          </h2>
          <button
            onClick={onClose}
            aria-label="Close language picker"
            className="p-1 rounded-lg hover:bg-[var(--color-surface-container-high)] transition-colors
                       text-[var(--color-on-surface-variant)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 shrink-0">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search for a language…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-6">

          {/* Instant languages */}
          {instantItems.length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
                {languages ? 'Languages' : 'Instant Languages'}
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {instantItems.map((lang) => {
                  const isSelected = selectedLocale === lang.code
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelect(lang.code)}
                      className={`rounded-xl p-4 flex flex-col items-center gap-2 border transition-colors text-center relative
                        ${isSelected
                          ? 'border-[var(--color-primary-container)] bg-[var(--color-primary-fixed)]'
                          : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary-container)]'
                        }`}
                    >
                      <span className="text-3xl leading-none">{lang.flag ?? '🌐'}</span>
                      <span className="text-sm font-semibold text-[var(--color-on-surface)] leading-tight">
                        {lang.label}
                      </span>
                      {showAudioIndicator && !TTS_SUPPORTED_LANGUAGES.has(lang.code) && (
                        <span className="text-[10px] text-[var(--color-on-surface-variant)] opacity-60">
                          No audio
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Translated languages */}
          {translatedItems.length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
                Translated
              </p>
              <div className="space-y-1">
                {translatedItems.map((lang) => {
                  const isSelected = selectedLocale === lang.code
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelect(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm
                        text-left transition-colors
                        ${isSelected
                          ? 'bg-[var(--color-primary-fixed)] text-[var(--color-on-surface)]'
                          : 'hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]'
                        }`}
                    >
                      <span>{lang.label}</span>
                      <div className="flex items-center gap-1.5 ml-3 shrink-0">
                        {showAudioIndicator && !TTS_SUPPORTED_LANGUAGES.has(lang.code) && (
                          <span className="text-xs text-[var(--color-on-surface-variant)] opacity-60">
                            No audio
                          </span>
                        )}
                        <span className="text-xs bg-[var(--color-surface-container-high)]
                                         text-[var(--color-on-surface-variant)]
                                         rounded-full px-2 py-0.5">
                          Translated
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {instantItems.length === 0 && translatedItems.length === 0 && (
            <p className="text-[var(--color-on-surface-variant)] text-sm py-8 text-center">
              No languages found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

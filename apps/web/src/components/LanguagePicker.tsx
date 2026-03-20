import { useState, useRef, useEffect } from 'react'
import { AZURE_TRANSLATION_LANGUAGES } from '@caption-aotearoa/shared/azureLanguages'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'

interface LanguagePickerProps {
  selectedLocale: string
  onSelect: (locale: string) => void
}

const NZ_CODES = new Set(NZ_LANGUAGES.map((l) => l.code))

export function LanguagePicker({ selectedLocale, onSelect }: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const currentLabel =
    NZ_LANGUAGES.find((l) => l.code === selectedLocale)?.label ??
    AZURE_TRANSLATION_LANGUAGES.find((l) => l.code === selectedLocale || l.bcp47 === selectedLocale)?.label ??
    selectedLocale

  const query = search.toLowerCase()

  // NZ census languages — always "Instant"
  const instantItems = NZ_LANGUAGES.map((l) => ({ key: l.code, label: l.label }))

  // All other Azure languages — "Translated" tier
  const otherItems = AZURE_TRANSLATION_LANGUAGES
    .filter((l) => !NZ_CODES.has(l.code))
    .map((l) => ({ key: l.code, label: l.label }))

  const filteredInstant = instantItems.filter((i) => i.label.toLowerCase().includes(query))
  const filteredOther = otherItems.filter((i) => i.label.toLowerCase().includes(query))

  function handleSelect(key: string) {
    onSelect(key)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg px-4 py-2 text-sm font-medium bg-surface-container-high text-on-surface border border-outline-variant/30 hover:border-primary/50 transition-colors flex items-center gap-2"
      >
        <span>{currentLabel}</span>
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant/30 overflow-hidden z-50">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search languages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-3 text-sm bg-surface-container border-b border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />

          <div className="max-h-64 overflow-y-auto">
            {filteredInstant.length > 0 && (
              <>
                {filteredInstant.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleSelect(item.key)}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-surface-container-high transition-colors min-h-[48px] ${
                      selectedLocale === item.key ? 'bg-surface-container-high font-semibold text-on-surface' : 'text-on-surface-variant'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs bg-primary-container text-primary rounded-pill px-2 py-0.5 font-medium">Instant</span>
                  </button>
                ))}
                {filteredOther.length > 0 && (
                  <div className="border-t border-outline-variant/20 mx-2" />
                )}
              </>
            )}

            {filteredOther.map((item) => (
              <button
                key={item.key}
                onClick={() => handleSelect(item.key)}
                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-surface-container-high transition-colors min-h-[48px] ${
                  selectedLocale === item.key ? 'bg-surface-container-high font-semibold text-on-surface' : 'text-on-surface-variant'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs bg-surface-container-high text-secondary rounded-pill px-2 py-0.5">Translated</span>
              </button>
            ))}

            {filteredInstant.length === 0 && filteredOther.length === 0 && (
              <p className="px-4 py-3 text-sm text-secondary">No languages found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

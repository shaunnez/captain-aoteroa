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
        className="rounded-pill px-4 py-1.5 text-sm font-medium bg-white text-brand-navy border border-white hover:bg-brand-sand transition-colors flex items-center gap-2"
      >
        <span>{currentLabel}</span>
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-brand-purple border-opacity-20 overflow-hidden z-50">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search languages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-brand-purple border-opacity-20 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-opacity-30 text-black"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredInstant.length > 0 && (
              <>
                {filteredInstant.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleSelect(item.key)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-brand-sand transition-colors ${
                      selectedLocale === item.key ? 'bg-brand-sand font-semibold text-brand-purple' : 'text-brand-black'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs bg-brand-purple text-white rounded-pill px-2 py-0.5">Instant</span>
                  </button>
                ))}
                {filteredOther.length > 0 && (
                  <div className="border-t border-brand-purple border-opacity-10 mx-2" />
                )}
              </>
            )}

            {filteredOther.map((item) => (
              <button
                key={item.key}
                onClick={() => handleSelect(item.key)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-brand-sand transition-colors ${
                  selectedLocale === item.key ? 'bg-brand-sand font-semibold text-brand-purple' : 'text-brand-black'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs bg-brand-purple bg-opacity-10 text-brand-purple rounded-pill px-2 py-0.5">Translated</span>
              </button>
            ))}

            {filteredInstant.length === 0 && filteredOther.length === 0 && (
              <p className="px-4 py-3 text-sm text-brand-purple opacity-60">No languages found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

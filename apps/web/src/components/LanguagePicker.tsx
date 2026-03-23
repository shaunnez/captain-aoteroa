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

  const currentLang =
    NZ_LANGUAGES.find((l) => l.code === selectedLocale) ??
    AZURE_TRANSLATION_LANGUAGES.find((l) => l.code === selectedLocale || l.bcp47 === selectedLocale)
  const currentLabel = currentLang?.label ?? selectedLocale
  const currentFlag = NZ_LANGUAGES.find((l) => l.code === selectedLocale)?.flag ?? ''

  const query = search.toLowerCase()

  // NZ census languages — always "Instant"
  const instantItems = NZ_LANGUAGES.map((l) => ({ key: l.code, label: l.label, flag: l.flag ?? '' }))

  // All other Azure languages — "Translated" tier
  const otherItems = AZURE_TRANSLATION_LANGUAGES
    .filter((l) => !NZ_CODES.has(l.code))
    .map((l) => ({ key: l.code, label: l.label, flag: '' }))

  const filteredInstant = instantItems.filter((i) => i.label.toLowerCase().includes(query))
  const filteredOther = otherItems.filter((i) => i.label.toLowerCase().includes(query))

  function handleSelect(key: string) {
    onSelect(key)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-[9999px] px-3 py-1.5 text-sm font-medium
                   bg-[var(--color-surface-container-high)]
                   text-[var(--color-on-surface)]
                   border border-[var(--color-outline-variant)]
                   hover:bg-[var(--color-surface-container-highest)]
                   transition-colors flex items-center gap-2"
      >
        {currentFlag && <span className="text-base leading-none">{currentFlag}</span>}
        <span>{currentLabel}</span>
        <svg className="w-3 h-3 opacity-60" viewBox="0 0 12 12" fill="none">
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80
                        bg-[var(--color-surface-container-high)]
                        rounded-xl shadow-xl
                        border border-[var(--color-outline-variant)]
                        overflow-hidden z-50">
          {/* Search */}
          <div className="p-2 border-b border-[var(--color-outline-variant)]">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search languages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg
                         bg-[var(--color-surface-container-low)]
                         border border-[var(--color-outline-variant)]
                         text-[var(--color-on-surface)]
                         placeholder:text-[var(--color-on-surface-variant)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div
            className="max-h-72 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#311b92 transparent' }}
          >
            {/* Instant tier — NZ census languages as grid */}
            {filteredInstant.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 mb-1">
                  <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">
                    Instant
                  </span>
                  <span className="text-xs bg-[var(--color-primary-container)] text-white rounded-[9999px] px-2 py-0.5">
                    NZ languages
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {filteredInstant.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleSelect(item.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        selectedLocale === item.key
                          ? 'bg-[var(--color-primary-fixed)] font-semibold text-[var(--color-primary)]'
                          : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
                      }`}
                    >
                      <span className="text-base leading-none flex-shrink-0">{item.flag}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {filteredInstant.length > 0 && filteredOther.length > 0 && (
              <div className="border-t border-[var(--color-outline-variant)] mx-2 my-1" />
            )}

            {/* Translated tier */}
            {filteredOther.length > 0 && (
              <div className="p-2">
                {!query && (
                  <div className="px-2 py-1 mb-1">
                    <span className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                      Translated
                    </span>
                  </div>
                )}
                {filteredOther.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleSelect(item.key)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedLocale === item.key
                        ? 'bg-[var(--color-primary-fixed)] font-semibold text-[var(--color-primary)]'
                        : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs bg-[var(--color-primary-fixed)] text-[var(--color-primary)] rounded-[9999px] px-2 py-0.5 flex-shrink-0">
                      Translated
                    </span>
                  </button>
                ))}
              </div>
            )}

            {filteredInstant.length === 0 && filteredOther.length === 0 && (
              <p className="px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">No languages found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

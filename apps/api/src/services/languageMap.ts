/**
 * Convert a BCP-47 locale (e.g. "en-NZ") to the short code Azure Translation uses (e.g. "en").
 * Preserves script subtags: "zh-Hans" → "zh-Hans", "zh-Hant" → "zh-Hant".
 */
export function bcp47ToTranslationCode(locale: string): string {
  // Script subtags are 4 chars (title-case). Keep them: zh-Hans, zh-Hant, sr-Latn, etc.
  const parts = locale.split('-')
  if (parts.length >= 2 && parts[1].length === 4) {
    return `${parts[0]}-${parts[1]}`
  }
  return parts[0]
}

/**
 * Reverse lookup: given a translation code (e.g. "en") and the event's BCP-47 locales,
 * find the matching full locale (e.g. "en-NZ"). Falls back to `code` if no match.
 */
export function translationCodeToBcp47(code: string, eventLanguages: string[]): string {
  return eventLanguages.find((l) => l.startsWith(code + '-') || l === code) ?? code
}

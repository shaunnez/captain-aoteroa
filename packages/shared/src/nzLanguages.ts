export interface NzLanguage {
  code: string   // Azure Translator code
  label: string  // Display name
  flag?: string  // ISO 3166-1 alpha-2 country code (lowercase) for flag-icons
}

/**
 * All NZ census languages supported by Azure Translator.
 * Single source of truth — every event translates to all of these automatically.
 */
export const NZ_LANGUAGES: NzLanguage[] = [
  { code: 'en',      label: 'English',               flag: 'gb' },
  { code: 'mi',      label: 'Te reo Māori',           flag: 'nz' },
  { code: 'sm',      label: 'Samoan',                 flag: 'ws' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)',   flag: 'cn' },
  { code: 'hi',      label: 'Hindi',                  flag: 'in' },
  { code: 'fil',     label: 'Filipino',               flag: 'ph' },
  { code: 'yue',     label: 'Cantonese',              flag: 'cn' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)',  flag: 'cn' },
  { code: 'fr',      label: 'French',                 flag: 'fr' },
  { code: 'pa',      label: 'Punjabi',                flag: 'in' },
  { code: 'af',      label: 'Afrikaans',              flag: 'za' },
  { code: 'es',      label: 'Spanish',                flag: 'es' },
  { code: 'de',      label: 'German',                 flag: 'de' },
  { code: 'to',      label: 'Tongan',                 flag: 'to' },
  { code: 'ko',      label: 'Korean',                 flag: 'kr' },
  { code: 'ja',      label: 'Japanese',               flag: 'jp' },
  { code: 'gu',      label: 'Gujarati',               flag: 'in' },
  { code: 'nl',      label: 'Dutch',                  flag: 'nl' },
  { code: 'ml',      label: 'Malayalam',              flag: 'in' },
  { code: 'pt',      label: 'Portuguese',             flag: 'pt' },
  { code: 'ru',      label: 'Russian',                flag: 'ru' },
  { code: 'ar',      label: 'Arabic',                 flag: 'sa' },
  { code: 'ta',      label: 'Tamil',                  flag: 'in' },
  { code: 'si',      label: 'Sinhala',                flag: 'lk' },
  { code: 'it',      label: 'Italian',                flag: 'it' },
  { code: 'th',      label: 'Thai',                   flag: 'th' },
  { code: 'vi',      label: 'Vietnamese',             flag: 'vn' },
  { code: 'fa',      label: 'Persian',                flag: 'ir' },
  { code: 'ur',      label: 'Urdu',                   flag: 'pk' },
  { code: 'ms',      label: 'Malay',                  flag: 'my' },
  { code: 'fj',      label: 'Fijian',                 flag: 'fj' },
  { code: 'km',      label: 'Khmer',                  flag: 'kh' },
  { code: 'id',      label: 'Indonesian',             flag: 'id' },
  { code: 'te',      label: 'Telugu',                 flag: 'in' },
  { code: 'mr',      label: 'Marathi',                flag: 'in' },
  { code: 'sr',      label: 'Serbian',                flag: 'rs' },
]

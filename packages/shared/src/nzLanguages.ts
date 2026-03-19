export interface NzLanguage {
  code: string   // Azure Translator code
  label: string  // Display name
}

/**
 * All NZ census languages supported by Azure Translator.
 * Single source of truth — every event translates to all of these automatically.
 */
export const NZ_LANGUAGES: NzLanguage[] = [
  { code: 'en',      label: 'English' },
  { code: 'mi',      label: 'Te reo Māori' },
  { code: 'sm',      label: 'Samoan' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)' },
  { code: 'hi',      label: 'Hindi' },
  { code: 'fil',     label: 'Filipino' },
  { code: 'yue',     label: 'Cantonese' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)' },
  { code: 'fr',      label: 'French' },
  { code: 'pa',      label: 'Punjabi' },
  { code: 'af',      label: 'Afrikaans' },
  { code: 'es',      label: 'Spanish' },
  { code: 'de',      label: 'German' },
  { code: 'to',      label: 'Tongan' },
  { code: 'ko',      label: 'Korean' },
  { code: 'ja',      label: 'Japanese' },
  { code: 'gu',      label: 'Gujarati' },
  { code: 'nl',      label: 'Dutch' },
  { code: 'ml',      label: 'Malayalam' },
  { code: 'pt',      label: 'Portuguese' },
  { code: 'ru',      label: 'Russian' },
  { code: 'ar',      label: 'Arabic' },
  { code: 'ta',      label: 'Tamil' },
  { code: 'si',      label: 'Sinhala' },
  { code: 'it',      label: 'Italian' },
  { code: 'th',      label: 'Thai' },
  { code: 'vi',      label: 'Vietnamese' },
  { code: 'fa',      label: 'Persian' },
  { code: 'ur',      label: 'Urdu' },
  { code: 'ms',      label: 'Malay' },
  { code: 'fj',      label: 'Fijian' },
  { code: 'km',      label: 'Khmer' },
  { code: 'id',      label: 'Indonesian' },
  { code: 'te',      label: 'Telugu' },
  { code: 'mr',      label: 'Marathi' },
  { code: 'sr',      label: 'Serbian' },
]

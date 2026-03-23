export interface NzLanguage {
  code: string   // Azure Translator code
  label: string  // Display name
  flag?: string  // Emoji flag
}

/**
 * All NZ census languages supported by Azure Translator.
 * Single source of truth — every event translates to all of these automatically.
 */
export const NZ_LANGUAGES: NzLanguage[] = [
  { code: 'en',      label: 'English',               flag: '🇬🇧' },
  { code: 'mi',      label: 'Te reo Māori',           flag: '🇳🇿' },
  { code: 'sm',      label: 'Samoan',                 flag: '🇼🇸' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)',   flag: '🇨🇳' },
  { code: 'hi',      label: 'Hindi',                  flag: '🇮🇳' },
  { code: 'fil',     label: 'Filipino',               flag: '🇵🇭' },
  { code: 'yue',     label: 'Cantonese',              flag: '🇨🇳' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)',  flag: '🇨🇳' },
  { code: 'fr',      label: 'French',                 flag: '🇫🇷' },
  { code: 'pa',      label: 'Punjabi',                flag: '🇮🇳' },
  { code: 'af',      label: 'Afrikaans',              flag: '🇿🇦' },
  { code: 'es',      label: 'Spanish',                flag: '🇪🇸' },
  { code: 'de',      label: 'German',                 flag: '🇩🇪' },
  { code: 'to',      label: 'Tongan',                 flag: '🇹🇴' },
  { code: 'ko',      label: 'Korean',                 flag: '🇰🇷' },
  { code: 'ja',      label: 'Japanese',               flag: '🇯🇵' },
  { code: 'gu',      label: 'Gujarati',               flag: '🇮🇳' },
  { code: 'nl',      label: 'Dutch',                  flag: '🇳🇱' },
  { code: 'ml',      label: 'Malayalam',              flag: '🇮🇳' },
  { code: 'pt',      label: 'Portuguese',             flag: '🇵🇹' },
  { code: 'ru',      label: 'Russian',                flag: '🇷🇺' },
  { code: 'ar',      label: 'Arabic',                 flag: '🇸🇦' },
  { code: 'ta',      label: 'Tamil',                  flag: '🇮🇳' },
  { code: 'si',      label: 'Sinhala',                flag: '🇱🇰' },
  { code: 'it',      label: 'Italian',                flag: '🇮🇹' },
  { code: 'th',      label: 'Thai',                   flag: '🇹🇭' },
  { code: 'vi',      label: 'Vietnamese',             flag: '🇻🇳' },
  { code: 'fa',      label: 'Persian',                flag: '🇮🇷' },
  { code: 'ur',      label: 'Urdu',                   flag: '🇵🇰' },
  { code: 'ms',      label: 'Malay',                  flag: '🇲🇾' },
  { code: 'fj',      label: 'Fijian',                 flag: '🇫🇯' },
  { code: 'km',      label: 'Khmer',                  flag: '🇰🇭' },
  { code: 'id',      label: 'Indonesian',             flag: '🇮🇩' },
  { code: 'te',      label: 'Telugu',                 flag: '🇮🇳' },
  { code: 'mr',      label: 'Marathi',                flag: '🇮🇳' },
  { code: 'sr',      label: 'Serbian',                flag: '🇷🇸' },
]

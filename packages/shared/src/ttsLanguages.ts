/**
 * Azure Translator language codes that have a corresponding Azure Neural TTS voice.
 * Languages not in this list (e.g. Tongan, Fijian) cannot be synthesised — the UI
 * should hide the audio toggle for those languages.
 */
export const TTS_SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
  'en', 'zh-Hans', 'zh-Hant', 'hi', 'fil', 'yue',
  'fr', 'pa', 'af', 'es', 'de', 'ko', 'ja', 'gu', 'nl',
  'ml', 'pt', 'ru', 'ar', 'ta', 'si', 'it', 'th', 'vi',
  'fa', 'ur', 'ms', 'km', 'id', 'te', 'mr', 'sr',
])

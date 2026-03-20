/**
 * Maps Azure Translator short codes to BCP-47 speech recognition locales
 * for languages supported by Azure Speech-to-Text.
 *
 * Languages NOT included (no Azure STT support):
 *   sm (Samoan), to (Tongan), fj (Fijian)
 *
 * Languages NOT included (handled separately):
 *   mi (Te reo Māori) — uses Papa Reo
 */
export const RECOGNITION_LOCALES: Record<string, string> = {
  'af':      'af-ZA',
  'ar':      'ar-SA',
  'de':      'de-DE',
  'en':      'en-NZ',
  'es':      'es-ES',
  'fa':      'fa-IR',
  'fil':     'fil-PH',
  'fr':      'fr-FR',
  'gu':      'gu-IN',
  'hi':      'hi-IN',
  'id':      'id-ID',
  'it':      'it-IT',
  'ja':      'ja-JP',
  'km':      'km-KH',
  'ko':      'ko-KR',
  'ml':      'ml-IN',
  'mr':      'mr-IN',
  'ms':      'ms-MY',
  'nl':      'nl-NL',
  'pa':      'pa-IN',
  'pt':      'pt-PT',
  'ru':      'ru-RU',
  'si':      'si-LK',
  'sr':      'sr-RS',
  'ta':      'ta-IN',
  'te':      'te-IN',
  'th':      'th-TH',
  'ur':      'ur-IN',
  'vi':      'vi-VN',
  'yue':     'zh-HK',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
}

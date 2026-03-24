import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

/** Azure Neural TTS voice names keyed by Azure Translator language code. */
const VOICE_MAP: Record<string, string> = {
  'en':      'en-NZ-MollyNeural',
  'zh-Hans': 'zh-CN-XiaoxiaoNeural',
  'zh-Hant': 'zh-TW-HsiaoChenNeural',
  'hi':      'hi-IN-SwaraNeural',
  'fil':     'fil-PH-BlessicaNeural',
  'yue':     'yue-CN-XiaoMinNeural',
  'fr':      'fr-FR-DeniseNeural',
  'pa':      'pa-IN-OjasNeural',
  'af':      'af-ZA-AdriNeural',
  'es':      'es-ES-ElviraNeural',
  'de':      'de-DE-KatjaNeural',
  'ko':      'ko-KR-SunHiNeural',
  'ja':      'ja-JP-NanamiNeural',
  'gu':      'gu-IN-DhwaniNeural',
  'nl':      'nl-NL-ColetteNeural',
  'ml':      'ml-IN-SobhanaNeural',
  'pt':      'pt-PT-RaquelNeural',
  'ru':      'ru-RU-SvetlanaNeural',
  'ar':      'ar-SA-ZariyahNeural',
  'ta':      'ta-IN-PallaviNeural',
  'si':      'si-LK-ThiliniNeural',
  'it':      'it-IT-ElsaNeural',
  'th':      'th-TH-PremwadeeNeural',
  'vi':      'vi-VN-HoaiMyNeural',
  'fa':      'fa-IR-DilaraNeural',
  'ur':      'ur-PK-UzmaNeural',
  'ms':      'ms-MY-YasminNeural',
  'km':      'km-KH-SreymomNeural',
  'id':      'id-ID-GadisNeural',
  'te':      'te-IN-ShrutiNeural',
  'mr':      'mr-IN-AarohiNeural',
  'sr':      'sr-RS-SophieNeural',
}

interface TtsServiceOptions {
  speechKey: string
  speechRegion: string
}

export class TtsService {
  private options: TtsServiceOptions

  constructor(options: TtsServiceOptions) {
    this.options = options
  }

  /**
   * Synthesise `text` in the given language. Returns a Buffer of MP3 audio,
   * or null if the language has no Azure voice or synthesis fails.
   */
  async synthesize(text: string, language: string): Promise<Buffer | null> {
    const voice = VOICE_MAP[language]
    console.log('synthesize', text, language, voice)
    if (!voice) return null

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      this.options.speechKey,
      this.options.speechRegion,
    )
    speechConfig.speechSynthesisVoiceName = voice
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    // null audio config = return audio data in result, no device output
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as unknown as sdk.AudioConfig)

    console.log(`[TtsService] synthesizing lang=${language} voice=${voice} textLen=${text.length}`)
    return new Promise((resolve) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          synthesizer.close()
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted && result.audioData) {
            console.log(`[TtsService] success lang=${language} audioBytes=${result.audioData.byteLength}`)
            resolve(Buffer.from(result.audioData))
          } else {
            console.error(`[TtsService] failed lang=${language} voice=${voice} reason=${result.reason} details=${result.errorDetails}`)
            resolve(null)
          }
        },
        (error) => {
          synthesizer.close()
          console.error(`[TtsService] threw lang=${language} voice=${voice}:`, error)
          resolve(null)
        },
      )
    })
  }
}

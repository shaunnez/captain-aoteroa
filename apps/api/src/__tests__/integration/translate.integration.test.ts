import { describe, it, expect } from 'vitest'
import { translateText } from '../../services/translateText'

const skipAzure = process.env.AZURE_SPEECH_KEY === '__placeholder__'

const EN_PHRASE = 'Hello, welcome to the event.'
const MI_PHRASE = 'Kia ora, nau mai ki tēnei hui.'

describe.skipIf(skipAzure)('translate layer', () => {
  it('en→mi: returns non-empty te reo string', async () => {
    const result = await translateText(EN_PHRASE, 'en', ['mi'])
    console.log('[en→mi]', result)
    expect(result['mi']).toBeTruthy()
    expect(result['mi'].length).toBeGreaterThan(0)
  })

  it('en→fr: returns non-empty French string', async () => {
    const result = await translateText(EN_PHRASE, 'en', ['fr'])
    console.log('[en→fr]', result)
    expect(result['fr']).toBeTruthy()
    expect(result['fr'].length).toBeGreaterThan(0)
  })

  it('mi→en: returns non-empty English string', async () => {
    const result = await translateText(MI_PHRASE, 'mi', ['en'])
    console.log('[mi→en]', result)
    expect(result['en']).toBeTruthy()
    expect(result['en'].length).toBeGreaterThan(0)
  })

  it('mi→fr: returns non-empty French string', async () => {
    const result = await translateText(MI_PHRASE, 'mi', ['fr'])
    console.log('[mi→fr]', result)
    expect(result['fr']).toBeTruthy()
    expect(result['fr'].length).toBeGreaterThan(0)
  })
})

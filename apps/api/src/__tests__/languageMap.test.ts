import { describe, it, expect } from 'vitest'
import { bcp47ToTranslationCode, translationCodeToBcp47 } from '../services/languageMap'

describe('languageMap', () => {
  describe('bcp47ToTranslationCode', () => {
    it('converts en-NZ to en', () => {
      expect(bcp47ToTranslationCode('en-NZ')).toBe('en')
    })

    it('converts mi-NZ to mi', () => {
      expect(bcp47ToTranslationCode('mi-NZ')).toBe('mi')
    })

    it('preserves script subtags like zh-Hans', () => {
      expect(bcp47ToTranslationCode('zh-Hans')).toBe('zh-Hans')
    })

    it('preserves zh-Hant', () => {
      expect(bcp47ToTranslationCode('zh-Hant')).toBe('zh-Hant')
    })

    it('preserves sr-Latn', () => {
      expect(bcp47ToTranslationCode('sr-Latn')).toBe('sr-Latn')
    })

    it('handles bare language codes', () => {
      expect(bcp47ToTranslationCode('ja')).toBe('ja')
    })
  })

  describe('translationCodeToBcp47', () => {
    const languages = ['en-NZ', 'mi-NZ', 'sm', 'zh-Hans', 'ja']

    it('maps en back to en-NZ', () => {
      expect(translationCodeToBcp47('en', languages)).toBe('en-NZ')
    })

    it('maps mi back to mi-NZ', () => {
      expect(translationCodeToBcp47('mi', languages)).toBe('mi-NZ')
    })

    it('returns exact match for bare codes', () => {
      expect(translationCodeToBcp47('sm', languages)).toBe('sm')
    })

    it('returns exact match for script subtags', () => {
      expect(translationCodeToBcp47('zh-Hans', languages)).toBe('zh-Hans')
    })

    it('falls back to code if no match', () => {
      expect(translationCodeToBcp47('fr', languages)).toBe('fr')
    })
  })
})

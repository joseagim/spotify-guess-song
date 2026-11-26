import { describe, expect, it } from 'vitest'
import { en } from './en'
import { es } from './es'
import { detectLanguage, translate } from './translate'

describe('detectLanguage', () => {
  it('picks Spanish for any es-* browser language', () => {
    expect(detectLanguage(['es-ES', 'en'])).toBe('es')
    expect(detectLanguage(['ES-mx'])).toBe('es')
  })

  it('falls back to English', () => {
    expect(detectLanguage(['en-GB'])).toBe('en')
    expect(detectLanguage(['fr-FR', 'es'])).toBe('en')
    expect(detectLanguage([])).toBe('en')
  })
})

describe('translate', () => {
  it('interpolates variables and leaves unknown placeholders alone', () => {
    expect(translate('en', 'errors.trackUnavailable', { engine: 'Deezer' })).toBe(
      'This song isn’t available on Deezer.',
    )
    expect(translate('en', 'errors.trackUnavailable')).toContain('{engine}')
  })

  it('has a non-empty Spanish string for every English key', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(es[key], key).toBeTruthy()
    }
  })

  it('keeps the same placeholders in both languages', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(es[key]), key).toBe(placeholders(en[key]))
    }
  })
})

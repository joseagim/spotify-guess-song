import { en, type MessageKey } from './en'
import { es } from './es'

export type Language = 'en' | 'es'

export const LANGUAGES: readonly Language[] = ['en', 'es']

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
}

export type TranslateVars = Record<string, string | number>
export type Translate = (key: MessageKey, vars?: TranslateVars) => string

const dictionaries: Record<Language, Record<MessageKey, string>> = { en, es }

/** Spanish for any "es*" browser language, English otherwise. */
export function detectLanguage(browserLanguages: readonly string[]): Language {
  const first = browserLanguages[0]?.toLowerCase() ?? 'en'
  return first.startsWith('es') ? 'es' : 'en'
}

export function translate(language: Language, key: MessageKey, vars?: TranslateVars): string {
  const template = dictionaries[language][key] || en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export { type MessageKey }

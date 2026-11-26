import type { Language } from './translate'

const cache = new Map<string, Intl.NumberFormat>()

function formatter(language: Language, maxFractionDigits: number): Intl.NumberFormat {
  const key = `${language}:${maxFractionDigits}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(language, { maximumFractionDigits: maxFractionDigits })
    cache.set(key, f)
  }
  return f
}

/** 0.1 → "0.1" (en) / "0,1" (es) */
export function formatNumber(language: Language, value: number, maxFractionDigits = 1): string {
  return formatter(language, maxFractionDigits).format(value)
}

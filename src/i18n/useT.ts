import { useCallback } from 'react'
import { useSettings } from '../store/settings'
import { translate, type Translate } from './translate'

/** Translation function bound to the current UI language. */
export function useT(): Translate {
  const language = useSettings((s) => s.language)
  return useCallback<Translate>((key, vars) => translate(language, key, vars), [language])
}

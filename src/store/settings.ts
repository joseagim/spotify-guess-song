import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_VOLUME } from '../config/app'
import type { EngineId } from '../engines/types'
import { detectLanguage, type Language } from '../i18n/translate'

interface SettingsState {
  language: Language
  defaultEngine: EngineId
  /** 0..1 */
  volume: number
  setLanguage: (language: Language) => void
  setDefaultEngine: (engine: EngineId) => void
  setVolume: (volume: number) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: detectLanguage(typeof navigator === 'undefined' ? [] : navigator.languages),
      defaultEngine: 'deezer',
      volume: DEFAULT_VOLUME,
      setLanguage: (language) => set({ language }),
      setDefaultEngine: (defaultEngine) => set({ defaultEngine }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    }),
    { name: 'gs.settings', version: 1 },
  ),
)

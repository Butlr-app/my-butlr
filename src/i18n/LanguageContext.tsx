import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import fr from './fr.json'
import en from './en.json'

export type Language = 'fr' | 'en'

type TranslationMap = Record<string, unknown>

const translations: Record<Language, TranslationMap> = { fr, en }

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key,
})

function getNestedValue(obj: TranslationMap, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[k]
  }
  return typeof current === 'string' ? current : path
}

function detectBrowserLanguage(): Language {
  const nav = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'fr'
  return nav.startsWith('fr') ? 'fr' : 'en'
}

const STORAGE_KEY = 'butlr-language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr' || stored === 'en') return stored
    return detectBrowserLanguage()
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
  }, [])

  const t = useCallback((key: string): string => {
    return getNestedValue(translations[language], key)
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}

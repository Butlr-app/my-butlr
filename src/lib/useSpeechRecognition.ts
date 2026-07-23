import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export interface SpeechRecognitionHandlers {
  onInterim?: (transcript: string) => void
  onFinal?: (transcript: string) => void
  onError?: (message: string) => void
}

const speechErrors: Record<string, string> = {
  'not-allowed': 'Autorisez l’accès au microphone dans votre navigateur.',
  'service-not-allowed': 'La reconnaissance vocale n’est pas autorisée.',
  'no-speech': 'Aucune voix détectée. Réessayez.',
  'audio-capture': 'Microphone introuvable.',
  'network': 'Connexion réseau requise pour la dictée vocale.',
  'aborted': '',
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(handlers: SpeechRecognitionHandlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionConstructor()))
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback((lang = 'fr-FR') => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
    if (!SpeechRecognitionCtor) {
      const message = 'La dictée vocale n’est pas supportée par ce navigateur (Chrome ou Edge recommandé).'
      setError(message)
      handlersRef.current.onError?.(message)
      return
    }

    setError(null)

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const chunk = event.results[index][0]?.transcript ?? ''
        if (event.results[index].isFinal) finalText += chunk
        else interim += chunk
      }

      if (interim.trim()) {
        handlersRef.current.onInterim?.(interim.trim())
      }
      if (finalText.trim()) {
        handlersRef.current.onFinal?.(finalText.trim())
      }
    }

    recognition.onerror = (event) => {
      const message = speechErrors[event.error] ?? 'Erreur de reconnaissance vocale.'
      if (message) {
        setError(message)
        handlersRef.current.onError?.(message)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setListening(true)
    } catch {
      const message = 'Impossible de démarrer la dictée vocale.'
      setError(message)
      handlersRef.current.onError?.(message)
      setListening(false)
    }
  }, [])

  const toggle = useCallback((lang = 'fr-FR') => {
    if (listening) {
      stop()
      return
    }
    start(lang)
  }, [listening, start, stop])

  useEffect(() => () => {
    recognitionRef.current?.abort()
  }, [])

  return {
    supported,
    listening,
    error,
    start,
    stop,
    toggle,
    clearError: () => setError(null),
  }
}

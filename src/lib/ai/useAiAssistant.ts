import { useState, useCallback } from 'react'
import { chatWithAssistant, type AiMessage } from './aiService'

export function useAiAssistant() {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: AiMessage = { role: 'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setError(null)

    try {
      const allMessages = [...messages, userMsg]
      const response = await chatWithAssistant(allMessages)
      const assistantMsg: AiMessage = { role: 'assistant', content: response, timestamp: new Date() }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }, [messages])

  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, loading, error, sendMessage, clearHistory }
}

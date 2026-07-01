import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2, Trash2, Minimize2 } from 'lucide-react'
import { useAiAssistant } from '@/lib/ai/useAiAssistant'
import { useTranslation } from '@/i18n/LanguageContext'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { cn } from '@/lib/utils'

export function AiAssistantPanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const { messages, loading, sendMessage, clearHistory } = useAiAssistant()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSend = () => {
    if (!input.trim() || loading) return
    sendMessage(input.trim())
    setInput('')
  }

  const quickPrompts = [
    { label: t('ai.quickTasks'), prompt: 'Quelles tâches sont prioritaires aujourd\'hui ?' },
    { label: t('ai.quickRevenue'), prompt: 'Analyse mes revenus ce mois-ci' },
    { label: t('ai.quickServices'), prompt: 'Quels services proposer aux guests actuels ?' },
    { label: t('ai.quickCheckin'), prompt: 'Comment préparer le prochain check-in ?' },
  ]

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-[60] flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105',
          open
            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
            : 'bg-gradient-to-br from-primary to-primary/80 text-white hover:shadow-xl hover:shadow-primary/25'
        )}
        aria-label={open ? t('ai.close') : t('ai.open')}
      >
        {open ? <Minimize2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {/* Panel */}
      <div className={cn(
        'fixed bottom-24 right-6 z-[60] w-[380px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right',
        open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
      )} style={{ height: '560px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{t('ai.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('ai.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title={t('ai.clearHistory')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">{t('ai.welcomeTitle')}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('ai.welcomeSubtitle')}</p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {quickPrompts.map((qp) => (
                  <button
                    key={qp.prompt}
                    onClick={() => sendMessage(qp.prompt)}
                    className="text-left text-xs px-3 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">{t('ai.thinking')}</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              placeholder={t('ai.placeholder')}
              className="flex-1 h-10 px-4 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => { clearHistory(); setShowClearConfirm(false) }}
        title={t('ai.clearHistory')}
        message={t('ai.clearHistoryConfirm') || 'This will erase all messages. Continue?'}
        confirmLabel={t('ai.clearHistory')}
      />
    </>
  )
}

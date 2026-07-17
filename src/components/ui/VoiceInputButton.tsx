import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpeechRecognition } from '@/lib/useSpeechRecognition'

interface VoiceInputButtonProps {
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
  lang?: string
  ariaLabel?: string
  onInterim?: (transcript: string) => void
  onFinal: (transcript: string) => void
  onError?: (message: string) => void
}

export function VoiceInputButton({
  disabled = false,
  className,
  size = 'md',
  lang = 'fr-FR',
  ariaLabel = 'Dicter un message',
  onInterim,
  onFinal,
  onError,
}: VoiceInputButtonProps) {
  const { supported, listening, toggle } = useSpeechRecognition({
    onInterim,
    onFinal,
    onError,
  })

  if (!supported) return null

  const dimension = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => toggle(lang)}
      aria-label={listening ? 'Arrêter la dictée' : ariaLabel}
      aria-pressed={listening}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-40',
        dimension,
        listening
          ? 'bg-destructive text-destructive-foreground animate-pulse'
          : 'bg-muted text-foreground hover:bg-muted/80',
        className,
      )}
    >
      {listening ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
    </button>
  )
}

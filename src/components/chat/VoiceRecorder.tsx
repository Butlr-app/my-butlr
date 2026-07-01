import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { uploadChatAttachment } from '@/lib/storage'

interface VoiceRecorderProps {
  onRecorded: (url: string, durationSec: number) => void
  disabled?: boolean
}

export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size < 1000) return
        setUploading(true)
        try {
          const url = await uploadChatAttachment(blob, 'voice')
          onRecorded(url, elapsedRef.current)
        } catch {
          // silently fail; parent will not get the url
        }
        setUploading(false)
        setElapsed(0)
      }
      mediaRef.current = recorder
      recorder.start()
      setRecording(true)
      setElapsed(0)
      elapsedRef.current = 0
      timerRef.current = setInterval(() => setElapsed(s => { elapsedRef.current = s + 1; return s + 1 }), 1000)
    } catch {
      // microphone denied
    }
  }, [onRecorded])

  const stop = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
    setRecording(false)
  }, [])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (uploading) {
    return (
      <button type="button" disabled className="p-2 rounded-full bg-muted">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </button>
    )
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-destructive animate-pulse">{fmt(elapsed)}</span>
        <button
          type="button"
          onClick={stop}
          className="p-2 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
        >
          <Square className="w-4 h-4 text-destructive" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
      title="Send voice message"
    >
      <Mic className="w-4 h-4 text-muted-foreground" />
    </button>
  )
}

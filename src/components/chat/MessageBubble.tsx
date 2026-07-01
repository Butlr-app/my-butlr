import { useState, useEffect, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
import { ServiceCard } from './ServiceCard'
import type { Message, ServiceMessageMeta } from '@/lib/useSupabase'

interface MessageBubbleProps {
  msg: Message
  isMe: boolean
}

const roleColors: Record<string, string> = {
  owner: 'bg-amber-500',
  house_manager: 'bg-blue-500',
  concierge: 'bg-emerald-500',
  agency: 'bg-purple-500',
  guest: 'bg-gray-400',
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function getRoleLabel(role: string | null): string | null {
  const labels: Record<string, string> = {
    owner: 'Owner',
    house_manager: 'Manager',
    concierge: 'Concierge',
    agency: 'Agency',
    guest: 'Guest',
  }
  return role ? (labels[role] ?? role) : null
}

function VoicePlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [barHeights] = useState(() =>
    Array.from({ length: 20 }, (_, i) => 6 + Math.sin(i * 0.8) * 6 + Math.random() * 4),
  )

  useEffect(() => {
    const a = new Audio(url)
    const onEnded = () => setPlaying(false)
    a.addEventListener('ended', onEnded)
    audioRef.current = a
    return () => {
      a.pause()
      a.removeEventListener('ended', onEnded)
      audioRef.current = null
    }
  }, [url])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play()
      setPlaying(true)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 py-1"
    >
      {playing ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
      <div className="flex items-center gap-0.5">
        {barHeights.map((h, i) => (
          <span
            key={i}
            className="w-0.5 rounded-full bg-current opacity-60"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className="text-[10px] ml-1">Voice</span>
    </button>
  )
}

export function MessageBubble({ msg, isMe }: MessageBubbleProps) {
  const avatarColor = roleColors[msg.sender_role ?? 'guest'] ?? 'bg-gray-400'
  const roleLabel = getRoleLabel(msg.sender_role)
  const messageType = msg.message_type ?? 'text'

  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center shrink-0 mt-0.5`}>
        <span className="text-[10px] font-bold text-white leading-none">
          {getInitials(msg.sender_name)}
        </span>
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] space-y-0.5`}>
        {/* Sender info */}
        {!isMe && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[11px] font-medium">{msg.sender_name}</span>
            {roleLabel && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white ${avatarColor}`}>
                {roleLabel}
              </span>
            )}
          </div>
        )}

        <div className={`rounded-2xl px-3 py-2 ${
          isMe
            ? 'bg-foreground text-background rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        }`}>
          {/* Text */}
          {messageType === 'text' && (
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          )}

          {/* Image */}
          {messageType === 'image' && msg.attachment_url && (
            <div className="space-y-1">
              <img
                src={msg.attachment_url}
                alt="Shared image"
                className="max-w-full rounded-lg cursor-pointer"
                style={{ maxHeight: '240px' }}
                onClick={() => window.open(msg.attachment_url!, '_blank')}
              />
              {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
            </div>
          )}

          {/* Voice */}
          {messageType === 'voice' && msg.attachment_url && (
            <VoicePlayer url={msg.attachment_url} />
          )}

          {/* Service card */}
          {messageType === 'service' && msg.metadata && 'service_name' in msg.metadata && (
            <div className="space-y-1">
              <ServiceCard meta={msg.metadata as ServiceMessageMeta} isMe={isMe} />
              {msg.content && <p className="text-sm whitespace-pre-wrap mt-1">{msg.content}</p>}
            </div>
          )}

          {/* Timestamp */}
          <p className={`text-[10px] mt-1 ${isMe ? 'text-background/60' : 'text-muted-foreground'}`}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  )
}

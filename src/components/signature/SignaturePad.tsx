import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface SignaturePadProps {
  label: string
  value?: string
  onChange: (dataUrl: string) => void
}

export function SignaturePad({ label, value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typedValue, setTypedValue] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value || mode !== 'draw') return
    const image = new Image()
    image.onload = () => {
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    image.src = value
  }, [value, mode])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const position = point(event)
    context.beginPath()
    context.moveTo(position.x, position.y)
    context.strokeStyle = '#111827'
    context.lineWidth = 2.5
    context.lineCap = 'round'
    context.lineJoin = 'round'
    drawing.current = true
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const position = point(event)
    context.lineTo(position.x, position.y)
    context.stroke()
  }

  const finish = () => {
    drawing.current = false
    if (canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setTypedValue('')
    onChange('')
  }

  const applyTyped = (text: string) => {
    setTypedValue(text)
    const canvas = document.createElement('canvas')
    canvas.width = 700
    canvas.height = 180
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#111827'
    context.font = 'italic 64px Georgia, serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text.slice(0, 80), canvas.width / 2, canvas.height / 2)
    onChange(text.trim() ? canvas.toDataURL('image/png') : '')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex rounded-md border border-border p-0.5">
          <button type="button" onClick={() => setMode('draw')} className={`cursor-pointer rounded px-3 py-1 text-xs ${mode === 'draw' ? 'bg-foreground text-background' : ''}`}>Dessiner</button>
          <button type="button" onClick={() => setMode('type')} className={`cursor-pointer rounded px-3 py-1 text-xs ${mode === 'type' ? 'bg-foreground text-background' : ''}`}>Saisir</button>
        </div>
      </div>
      {mode === 'draw' ? (
        <canvas
          ref={canvasRef}
          width={700}
          height={180}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
          className="h-40 w-full touch-none rounded-md border border-dashed border-border bg-white"
          aria-label={label}
        />
      ) : (
        <div className="rounded-md border border-border bg-white p-4">
          <Input
            label="Votre nom ou vos initiales"
            value={typedValue}
            onChange={event => applyTyped(event.target.value)}
          />
          <p className="mt-4 min-h-16 text-center font-serif text-4xl italic text-black">
            {typedValue}
          </p>
        </div>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={clear}>Effacer</Button>
    </div>
  )
}

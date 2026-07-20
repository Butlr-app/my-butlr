import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Eraser } from 'lucide-react'

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void
  width?: number
  height?: number
}

export function SignatureCanvas({ onSignatureChange, width = 500, height = 200 }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!drawing) return
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endDraw = () => {
    if (!drawing) return
    setDrawing(false)
    setHasSignature(true)
    const canvas = canvasRef.current
    if (canvas) {
      onSignatureChange(canvas.toDataURL('image/png'))
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignatureChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative border border-input rounded-sm bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair touch-none"
          style={{ aspectRatio: `${width}/${height}` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-300 pointer-events-none select-none">
            Sign here
          </p>
        )}
      </div>
      {hasSignature && (
        <Button variant="secondary" size="sm" type="button" onClick={clear}>
          <Eraser className="w-4 h-4 mr-1" /> Clear signature
        </Button>
      )}
    </div>
  )
}

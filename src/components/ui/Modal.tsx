import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const modalStack: number[] = []
let modalSequence = 0
let openModalCount = 0

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const modalTokenRef = useRef(++modalSequence)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    openModalCount += 1
    document.body.style.overflow = 'hidden'
    return () => {
      openModalCount = Math.max(0, openModalCount - 1)
      if (openModalCount === 0) document.body.style.overflow = ''
    }
  }, [open])

  // Depend only on `open` (not `onClose`) so the focus trap isn't re-armed
  // on every render caused by a caller passing a new `onClose` reference.
  useEffect(() => {
    if (!open) return

    const token = modalTokenRef.current
    modalStack.push(token)
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    const dialogEl = dialogRef.current
    const focusables = dialogEl?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const firstFocusable = focusables?.[0]
    ;(firstFocusable ?? dialogEl)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (Math.max(...modalStack) !== token) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key === 'Tab' && dialogEl) {
        const focusableEls = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
          el => el.offsetParent !== null,
        )
        if (focusableEls.length === 0) return

        const first = focusableEls[0]
        const last = focusableEls[focusableEls.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const stackIndex = modalStack.lastIndexOf(token)
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1)
      previouslyFocusedRef.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/32" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative bg-card border border-border rounded-lg shadow-[var(--shadow-3)] w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200',
          className
        )}>
        {title && (
          <div className="flex items-center justify-between p-4 sm:p-6 pb-0">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="p-1 rounded hover:bg-muted transition-colors"
            >

              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

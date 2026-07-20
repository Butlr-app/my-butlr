import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const icons = {
    success: <Check className="w-4 h-4 text-emerald-400" />,
    error: <X className="w-4 h-4 text-red-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    info: <Info className="w-4 h-4 text-sky-400" />,
  }

  const borders = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    warning: 'border-amber-500/30',
    info: 'border-sky-500/30',
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${borders[toast.variant]} bg-card shadow-lg animate-in slide-in-from-right`}>
      {icons[toast.variant]}
      <p className="text-sm flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

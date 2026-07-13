import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import {
  formatDateForDisplay,
  normalizeDateFormat,
  parseDateInput,
} from '@/lib/dateFormat'
import { cn } from '@/lib/utils'

interface DateInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function DateInput({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  className,
}: DateInputProps) {
  const { profile } = useAuth()
  const format = normalizeDateFormat(profile?.date_format)
  const id = useId()
  const pickerRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(() => formatDateForDisplay(value, format))
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(formatDateForDisplay(value, format))
    setError('')
  }, [value, format])

  const validate = (nextDraft: string) => {
    if (!nextDraft.trim()) {
      const message = required ? 'Cette date est obligatoire.' : ''
      setError(message)
      textRef.current?.setCustomValidity(message)
      return !required
    }

    const parsed = parseDateInput(nextDraft, format)
    let message = parsed ? '' : `Saisissez la date au format ${format}.`

    if (parsed && min && parsed < min) message = 'Cette date est trop ancienne.'
    if (parsed && max && parsed > max) message = 'Cette date est trop éloignée.'

    setError(message)
    textRef.current?.setCustomValidity(message)
    if (!message && parsed) onChange(parsed)
    return !message
  }

  const handleDraftChange = (nextDraft: string) => {
    setDraft(nextDraft)
    setError('')
    textRef.current?.setCustomValidity('')

    if (!nextDraft) {
      onChange('')
      return
    }

    const parsed = parseDateInput(nextDraft, format)
    if (parsed && (!min || parsed >= min) && (!max || parsed <= max)) {
      onChange(parsed)
    }
  }

  const openPicker = () => {
    const picker = pickerRef.current
    if (!picker) return

    const showPicker = (picker as HTMLInputElement & {
      showPicker?: () => void
    }).showPicker

    if (showPicker) {
      showPicker.call(picker)
    } else {
      picker.click()
    }
  }

  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          ref={textRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={format}
          value={draft}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={event => handleDraftChange(event.target.value)}
          onBlur={() => validate(draft)}
          className={cn(
            'h-10 w-full rounded-sm border bg-card px-3 pr-11 text-sm tabular-nums transition-colors',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-1',
            error
              ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
              : 'border-input focus:border-info focus:ring-info/20',
          )}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          aria-label={`Ouvrir le calendrier pour ${label.toLowerCase()}`}
          className="absolute right-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={value}
          min={min}
          max={max}
          tabIndex={-1}
          aria-hidden="true"
          onChange={event => {
            onChange(event.target.value)
            setDraft(formatDateForDisplay(event.target.value, format))
            setError('')
            textRef.current?.setCustomValidity('')
          }}
          className="pointer-events-none absolute right-0 top-0 h-px w-px opacity-0"
        />
      </div>
      {error && <p id={errorId} className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  defaultPhonePrefix,
  formatPhoneValue,
  parsePhoneValue,
  phonePrefixes,
  type PhonePrefix,
} from '@/lib/phonePrefixes'

interface PhoneInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  name?: string
  className?: string
}

export function PhoneInput({
  label,
  value,
  onChange,
  placeholder = '6 12 34 56 78',
  required,
  name,
  className,
}: PhoneInputProps) {
  const parsed = parsePhoneValue(value)
  const [prefix, setPrefix] = useState<PhonePrefix>(parsed.prefix)
  const [number, setNumber] = useState(parsed.number)

  useEffect(() => {
    const next = parsePhoneValue(value)
    setPrefix(next.prefix)
    setNumber(next.number)
  }, [value])

  const updateValue = (nextPrefix: PhonePrefix, nextNumber: string) => {
    setPrefix(nextPrefix)
    setNumber(nextNumber)
    onChange(formatPhoneValue(nextPrefix, nextNumber))
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">{label}</label>
      )}

      <div className="flex gap-2">
        <select
          value={prefix.code}
          onChange={e => {
            const next = phonePrefixes.find(p => p.code === e.target.value) ?? defaultPhonePrefix
            updateValue(next, number)
          }}
          className="h-10 px-3 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 shrink-0 max-w-[140px]"
          aria-label="Country prefix"
        >
          {phonePrefixes.map(p => (
            <option key={p.code} value={p.code}>
              {p.flag} {p.dial}
            </option>
          ))}
        </select>

        <input
          type="tel"
          name={name}
          required={required}
          value={number}
          onChange={e => updateValue(prefix, e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-10 px-3 bg-card border border-input rounded-sm text-sm transition-colors focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}

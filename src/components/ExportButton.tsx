import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { generateCsv, downloadCsv } from '@/lib/importExport'
import { Download } from 'lucide-react'

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[]
  columns: { key: keyof T; label: string }[]
  filename: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  variant = 'secondary',
  size = 'sm',
}: ExportButtonProps<T>) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const handleExport = () => {
    if (data.length === 0) {
      toast(t('importExport.noData'), 'error')
      return
    }
    const csv = generateCsv(data, columns)
    downloadCsv(csv, filename)
    toast(`${data.length} ${t('importExport.rowsExported')}`, 'success')
  }

  return (
    <Button variant={variant} size={size} onClick={handleExport}>
      <Download className="w-3.5 h-3.5 mr-1.5" />
      {t('importExport.export')}
    </Button>
  )
}

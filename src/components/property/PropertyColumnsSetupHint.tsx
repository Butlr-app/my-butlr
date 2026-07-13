import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getSupabaseSqlEditorUrl } from '@/lib/supabase'

const COLUMN_SQL: Record<string, string> = {
  address: "ALTER TABLE properties ADD COLUMN IF NOT EXISTS address TEXT;",
  amenities: "ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;",
  surface_m2: "ALTER TABLE properties ADD COLUMN IF NOT EXISTS surface_m2 INTEGER;",
}

const COLUMN_LABELS: Record<string, string> = {
  address: 'Adresse',
  amenities: 'Équipements',
  surface_m2: 'Surface',
}

interface PropertyColumnsSetupHintProps {
  columns: string[]
}

export function PropertyColumnsSetupHint({ columns }: PropertyColumnsSetupHintProps) {
  const [copied, setCopied] = useState(false)

  const knownColumns = columns.filter(col => col in COLUMN_SQL)
  if (knownColumns.length === 0) return null

  const sql = knownColumns.map(col => COLUMN_SQL[col]).join('\n')
  const labels = knownColumns.map(col => COLUMN_LABELS[col] ?? col).join(', ')

  const copySql = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-md border border-warning/30 bg-warning-soft/40 p-3 space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">
          Certains champs n'ont pas pu être enregistrés : {labels}
        </p>
        <p className="text-xs text-muted-foreground">
          Les colonnes correspondantes n'existent pas encore dans la base. Ajoutez-les une seule
          fois via le SQL Editor, puis réessayez.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={copySql}>
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              SQL copié
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copier le SQL
            </>
          )}
        </Button>
        <a
          href={getSupabaseSqlEditorUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center h-8 px-3 text-xs font-medium rounded-sm border border-border bg-card hover:bg-muted/30 transition-colors"
        >
          Ouvrir le SQL Editor →
        </a>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { isStorageBucketMissingError } from '@/lib/propertyImageLimits'
import { PROPERTY_IMAGES_BUCKET_SQL } from '@/lib/propertyImagesBucketSql'
import { getSupabaseSqlEditorUrl } from '@/lib/supabase'

interface StorageBucketSetupHintProps {
  error: string
}

export function StorageBucketSetupHint({ error }: StorageBucketSetupHintProps) {
  const [copied, setCopied] = useState(false)

  if (!isStorageBucketMissingError(error)) return null

  const copySql = async () => {
    await navigator.clipboard.writeText(PROPERTY_IMAGES_BUCKET_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-3">
      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
        <li>Copiez le SQL ci-dessous</li>
        <li>Ouvrez le SQL Editor Supabase</li>
        <li>Collez et cliquez sur <strong>Run</strong></li>
        <li>Revenez ici et réessayez <strong>Enregistrer</strong></li>
      </ol>

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

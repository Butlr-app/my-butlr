import { supabase } from './supabase'
import type { ContractPrefillData } from './contractFiles'

const MAX_VISION_PAYLOAD_SIZE = 18 * 1024 * 1024

interface ContractVisionResponse {
  prefill: ContractPrefillData
  model: string
  warnings?: string[]
}

export async function analyzeContractWithVision(files: File[]) {
  const selectedFiles: File[] = []
  let totalSize = 0
  for (const file of files) {
    if (totalSize + file.size > MAX_VISION_PAYLOAD_SIZE) break
    selectedFiles.push(file)
    totalSize += file.size
  }
  if (selectedFiles.length === 0) {
    throw new Error('Le document est trop volumineux pour l’analyse Vision.')
  }

  const body = new FormData()
  selectedFiles.forEach(file => body.append('files', file, file.name))
  const { data, error } = await supabase.functions.invoke<ContractVisionResponse>(
    'contract-vision',
    { body },
  )

  if (error) throw new Error(error.message || 'Analyse Vision indisponible.')
  if (!data?.prefill || !Object.values(data.prefill).some(value => value !== null)) {
    throw new Error('Vision n’a trouvé aucune information exploitable.')
  }
  return data
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export interface ContractTemplateRow {
  id: string
  user_id: string | null
  name: string
  template_data: unknown
  created_at: string
  updated_at: string
}

export function useContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplateRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      // Table might not exist yet — silently fail
      setTemplates([])
    } else {
      setTemplates((data ?? []) as ContractTemplateRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const saveTemplate = async (name: string, templateData: unknown) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('contract_templates')
      .insert({
        user_id: user?.id ?? null,
        name,
        template_data: templateData,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTemplates(prev => [data as ContractTemplateRow, ...prev])
    return data as ContractTemplateRow
  }

  const updateTemplate = async (id: string, name: string, templateData: unknown) => {
    const { data, error } = await supabase
      .from('contract_templates')
      .update({ name, template_data: templateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTemplates(prev => prev.map(t => t.id === id ? (data as ContractTemplateRow) : t))
    return data as ContractTemplateRow
  }

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('contract_templates')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return { templates, loading, saveTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates }
}

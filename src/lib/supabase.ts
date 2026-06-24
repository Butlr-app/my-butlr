import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kpcahtliadmsaoespwpv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwY2FodGxpYWRtc2FvZXNwd3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMzM2NjksImV4cCI6MjA5NzgwOTY2OX0.IbL0h8RlbUUmmN9PFfS6rMMF7eW9_6hrZB1w8CFnn8s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

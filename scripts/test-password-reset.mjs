import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL ?? 'https://kpcahtliadmsaoespwpv.supabase.co'
const key = process.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwY2FodGxpYWRtc2FvZXNwd3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMzM2NjksImV4cCI6MjA5NzgwOTY2OX0.IbL0h8RlbUUmmN9PFfS6rMMF7eW9_6hrZB1w8CFnn8s'

const supabase = createClient(url, key)
const email = process.argv[2] ?? 'cmarcq@carfooly.com'
const redirectTo = 'http://localhost:5173/reset-password'

const { data, error: functionError } = await supabase.functions.invoke('password-reset', {
  body: { email, redirectTo },
})

let fallback = Boolean(data?.fallback)
let responseBody = data
if (functionError?.context && typeof functionError.context.json === 'function') {
  try {
    responseBody = await functionError.context.json()
    fallback = fallback || Boolean(responseBody?.fallback)
  } catch {
    fallback = true
  }
}

let authResult = null
if (fallback || functionError) {
  authResult = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

console.log(JSON.stringify({
  edge: { data, functionError: functionError?.message ?? null, responseBody, fallback },
  auth: { error: authResult?.error?.message ?? null },
}, null, 2))

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && anon ? createClient(url, anon) : null

export function functionsBase() {
  const customApi = import.meta.env.VITE_API_URL
  if (customApi) return customApi.replace(/\/$/, '')
  return `${(url || '').replace(/\/$/, '')}/functions/v1/shop-api`
}

export function isSupabaseConfigured() {
  return Boolean((url && anon && supabase) || import.meta.env.VITE_API_URL)
}

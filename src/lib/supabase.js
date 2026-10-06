import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && anon ? createClient(url, anon) : null

export function functionsBase() {
  return `${(url || '').replace(/\/$/, '')}/functions/v1/shop-api`
}

export function isSupabaseConfigured() {
  return Boolean(url && anon && supabase)
}

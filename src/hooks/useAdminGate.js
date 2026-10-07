import { useEffect, useState } from 'react'
import { api } from '../models/api'
import { supabase } from '../lib/supabase'

export function useAdminGate() {
  const [ok, setOk] = useState(null)
  useEffect(() => {
    async function check() {
      if (supabase) {
        const { data } = await supabase.auth.getSession()
        if (!data?.session) {
          setOk(false)
          return
        }
      }
      try {
        await api.adminMe()
        setOk(true)
      } catch {
        setOk(false)
      }
    }
    check()
  }, [])
  return ok
}


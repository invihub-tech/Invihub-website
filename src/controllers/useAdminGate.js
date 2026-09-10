import { useEffect, useState } from 'react'
import { api } from '../models/api'

export function useAdminGate() {
  const [ok, setOk] = useState(null)
  useEffect(() => {
    api.adminMe().then(() => setOk(true)).catch(() => setOk(false))
  }, [])
  return ok
}

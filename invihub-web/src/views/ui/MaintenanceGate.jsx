import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import MaintenancePage from '../shop/pages/MaintenancePage'
import { api } from '../../models/api'

export default function MaintenanceGate() {
  const location = useLocation()
  const [down, setDown] = useState(false)

  useEffect(() => {
    api
      .health()
      .then((h) => setDown(Boolean(h.maintenance)))
      .catch(() => {})
    const on = () => setDown(true)
    window.addEventListener('invi-maintenance', on)
    return () => window.removeEventListener('invi-maintenance', on)
  }, [location.pathname])

  if (down) {
    return (
      <div className="min-h-screen bg-black">
        <MaintenancePage />
      </div>
    )
  }
  return <Outlet />
}

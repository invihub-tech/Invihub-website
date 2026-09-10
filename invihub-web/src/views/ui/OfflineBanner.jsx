import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [networkFail, setNetworkFail] = useState(false)

  useEffect(() => {
    const on = () => {
      setOffline(false)
      setNetworkFail(false)
    }
    const off = () => setOffline(true)
    const fail = () => setNetworkFail(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('invi-network-error', fail)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('invi-network-error', fail)
    }
  }, [])

  if (!offline && !networkFail) return null

  return (
    <div className="z-[4000] bg-[#c5a059] px-4 py-2 text-center text-sm font-medium text-black" role="status">
      You appear to be offline. Check your connection — we will reconnect when the network is back.
    </div>
  )
}

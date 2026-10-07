import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Eye, RefreshCw } from 'lucide-react'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'

const STATUS_COLORS = {
  NEW: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  REVIEWING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  QUOTED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  APPROVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  IN_PRODUCTION: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/30',
  CANCELLED: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const ALL_STATUSES = Object.keys(STATUS_COLORS)

export default function AdminCustomRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ALL')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.adminCustomRequests()
      setRequests(Array.isArray(data) ? data : (data.requests || []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filterStatus === 'ALL'
    ? requests
    : requests.filter(r => r.status === filterStatus)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} className="text-[#c5a059]" />
          <h1 className="text-xl font-semibold">Custom Requests</h1>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
            {requests.length} total
          </span>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filterStatus === 'ALL' ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'border-white/10 text-white/50 hover:text-white'}`}
        >
          All
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filterStatus === s ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'border-white/10 text-white/50 hover:text-white'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-12 text-center text-white/40">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p>No custom requests yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs text-white/40">
                <th className="px-4 py-3 text-left">Request #</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Files</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-[#c5a059]">
                    {r.requestNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{r.customerName}</div>
                    <div className="text-xs text-white/40">{r.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {r.product ? r.product.name : <span className="italic text-white/30">General</span>}
                  </td>
                  <td className="px-4 py-3 text-white/60">{r.serviceType}</td>
                  <td className="px-4 py-3 text-white/60">{r.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-white/10 text-white/60 border-white/10'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{(r.files || []).length}</td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`${adminBase}/custom-requests/${r.id}`}
                      className="flex items-center gap-1 text-xs text-[#c5a059] hover:underline"
                    >
                      <Eye size={13} /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

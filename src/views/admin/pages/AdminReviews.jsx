import { useEffect, useState, useMemo } from 'react'
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  BadgeCheck,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import { api } from '../../../models/api'
import StatusBadge from '../../ui/StatusBadge'

export default function AdminReviews() {
  const [data, setData] = useState({ reviews: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0 } })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [productFilter, setProductFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (ratingFilter !== 'ALL') params.rating = ratingFilter
      if (productFilter !== 'ALL') params.productId = productFilter

      const res = await api.adminReviews(params)
      setData(res || { reviews: [], stats: {} })
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Failed to load reviews' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.adminProducts().then(setProducts).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [statusFilter, ratingFilter, productFilter])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await api.adminApproveReview(id)
      setFeedback({ type: 'success', message: 'Review approved successfully!' })
      load()
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Failed to approve review' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    try {
      await api.adminRejectReview(id)
      setFeedback({ type: 'success', message: 'Review marked as rejected.' })
      load()
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Failed to reject review' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to completely delete this review?')) return
    setActionLoading(id)
    try {
      await api.adminDeleteReview(id)
      setFeedback({ type: 'success', message: 'Review deleted successfully.' })
      load()
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Failed to delete review' })
    } finally {
      setActionLoading(null)
    }
  }

  // Filter in-memory for live search query
  const filteredReviews = useMemo(() => {
    const list = data.reviews || []
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter((r) =>
      r.customerName?.toLowerCase().includes(q) ||
      r.customerEmail?.toLowerCase().includes(q) ||
      r.product?.name?.toLowerCase().includes(q) ||
      r.product?.sku?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q)
    )
  }, [data.reviews, searchQuery])

  const stats = data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0 }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl">Product Reviews</h1>
          <p className="mt-1 text-xs text-white/50">
            Moderate customer feedback, approve genuine ratings, and manage product review records.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/15 text-red-300 border border-red-500/30'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
            Total Reviews
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">{stats.total}</div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">
            Pending Moderation
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-300">{stats.pending}</div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
            Approved Reviews
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-300">{stats.approved}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
            Average Live Rating
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#c5a059] flex items-center gap-1.5">
            {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
            <Star size={18} className="fill-[#c5a059] text-[#c5a059]" />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, email, title, or keyword..."
            className="w-full rounded-md border border-white/10 bg-black py-2 pl-9 pr-3 text-xs text-white placeholder-white/30 focus:border-[#c5a059] focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          <span className="text-white/40 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-white/10 bg-black px-2.5 py-1.5 text-xs text-white focus:border-[#c5a059] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div className="flex items-center gap-1">
          <span className="text-white/40 font-medium">Rating:</span>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="rounded-md border border-white/10 bg-black px-2.5 py-1.5 text-xs text-white focus:border-[#c5a059] focus:outline-none"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        {/* Product Filter */}
        <div className="flex items-center gap-1">
          <span className="text-white/40 font-medium">Product:</span>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="max-w-[180px] truncate rounded-md border border-white/10 bg-black px-2.5 py-1.5 text-xs text-white focus:border-[#c5a059] focus:outline-none"
          >
            <option value="ALL">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reviews Table / List */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-white/[0.02] text-white/40 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Rating</th>
              <th className="py-3 px-4">Customer Details</th>
              <th className="py-3 px-4">Review Content</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-white/40">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#c5a059]" />
                  Loading reviews…
                </td>
              </tr>
            ) : filteredReviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-white/40">
                  <MessageSquare size={28} className="mx-auto mb-2 text-white/20" />
                  No reviews found matching the selected criteria.
                </td>
              </tr>
            ) : (
              filteredReviews.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Product */}
                  <td className="py-3 px-4 max-w-[200px]">
                    <div className="font-medium text-white truncate" title={r.product?.name}>
                      {r.product?.name || 'Unknown Product'}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono mt-0.5">
                      {r.product?.sku || r.productId}
                    </div>
                  </td>

                  {/* Rating */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-white/20 fill-white/10'}
                        />
                      ))}
                      <span className="font-bold text-white text-xs ml-1">{r.rating}.0</span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-medium text-white flex items-center gap-1">
                      <span>{r.customerName}</span>
                      {r.verifiedPurchase && (
                        <span title="Verified Buyer" className="text-emerald-400">
                          <BadgeCheck size={13} />
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40">{r.customerEmail}</div>
                  </td>

                  {/* Review Content */}
                  <td className="py-3 px-4 max-w-sm">
                    {r.title && (
                      <div className="font-bold text-white text-xs mb-1 line-clamp-1">{r.title}</div>
                    )}
                    <p className="text-white/70 line-clamp-2 text-xs leading-relaxed">{r.comment}</p>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-4 whitespace-nowrap text-white/40 text-[11px]">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge value={r.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {r.status !== 'APPROVED' && (
                        <button
                          type="button"
                          disabled={actionLoading === r.id}
                          onClick={() => handleApprove(r.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                      )}

                      {r.status !== 'REJECTED' && (
                        <button
                          type="button"
                          disabled={actionLoading === r.id}
                          onClick={() => handleReject(r.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={actionLoading === r.id}
                        onClick={() => handleDelete(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

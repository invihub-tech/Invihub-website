import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Download, Truck, CheckCircle2 } from 'lucide-react'
import { api, inr } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import StatusBadge from '../../ui/StatusBadge'

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  const [exporting, setExporting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    api.adminOrders().then(setRows).catch(() => {})
  }, [])

  // Shiprocket Exact 17-Column Bulk CSV Export
  const handleExportShiprocket = async () => {
    setExporting(true)
    setFeedback(null)
    try {
      // 1. Filter all PAID and UNSHIPPED orders
      const eligible = rows.filter((o) => {
        const payOk = o.paymentStatus === 'PAID' || o.paymentStatus === 'CAPTURED'
        const notShipped = o.orderStatus !== 'SHIPPED' && o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
        return payOk && notShipped
      })

      if (eligible.length === 0) {
        setFeedback({ type: 'info', text: 'No paid & unfulfilled orders ready to ship right now.' })
        setTimeout(() => setFeedback(null), 4000)
        setExporting(false)
        return
      }

      // Fetch full order details including line items for each order
      const fullOrders = await Promise.all(
        eligible.map((o) => api.adminOrder(o.id).catch(() => o))
      )

      // 2. Generate Shiprocket's exact CSV template headers
      // *Order Id, *Order Date, *Customer Name, *Customer Email, *Customer Phone,
      // *Shipping Address Line 1, *Shipping City, *Shipping State, *Shipping Pincode,
      // *Product Name, *SKU, *Quantity, *Selling Price, *Payment Method,
      // *Weight (kg), *Length (cm), *Breadth (cm), *Height (cm)
      const headers = [
        '*Order Id',
        '*Order Date',
        '*Customer Name',
        '*Customer Email',
        '*Customer Phone',
        '*Shipping Address Line 1',
        '*Shipping City',
        '*Shipping State',
        '*Shipping Pincode',
        '*Product Name',
        '*SKU',
        '*Quantity',
        '*Selling Price',
        '*Payment Method',
        '*Weight (kg)',
        '*Length (cm)',
        '*Breadth (cm)',
        '*Height (cm)',
      ]

      const csvLines = [headers.join(',')]

      for (const ord of fullOrders) {
        const orderId = String(ord.orderNumber || ord.id || '').replace(/"/g, '""')
        const orderDate = new Date(ord.createdAt || Date.now()).toISOString().split('T')[0]
        const custName = String(ord.shippingName || ord.customer?.name || 'Customer').replace(/"/g, '""')
        const custEmail = String(ord.shippingEmail || ord.customer?.email || '').replace(/"/g, '""')
        const custPhone = String(ord.shippingPhone || ord.customer?.phone || '').replace(/"/g, '""')
        const addrLine1 = String([ord.shippingLine1, ord.shippingLine2].filter(Boolean).join(', ') || 'Address Line 1').replace(/"/g, '""')
        const city = String(ord.shippingCity || '').replace(/"/g, '""')
        const state = String(ord.shippingState || '').replace(/"/g, '""')
        const pincode = String(ord.shippingPin || '').replace(/"/g, '""')
        const paymentMethod = 'Prepaid' // Hardcoded as Prepaid per Shiprocket spec

        const items = ord.items?.length ? ord.items : [{ name: 'Custom 3D Product', sku: 'INVI-PROD', quantity: 1, unitPrice: ord.total }]

        for (const item of items) {
          const prodName = String(item.name || 'Product').replace(/"/g, '""')
          const sku = String(item.sku || `INVI-${(item.productId || 'SKU').slice(0, 8)}`).replace(/"/g, '""')
          const qty = Number(item.quantity || 1)
          const price = Number(item.unitPrice ?? item.price ?? ord.total)
          const weightKg = ((item.deadWeightGrams || 250) / 1000).toFixed(2)
          const len = Number(item.lengthCm || 15)
          const breadth = Number(item.widthCm || 10)
          const height = Number(item.heightCm || 10)

          const row = [
            `"${orderId}"`,
            `"${orderDate}"`,
            `"${custName}"`,
            `"${custEmail}"`,
            `"${custPhone}"`,
            `"${addrLine1}"`,
            `"${city}"`,
            `"${state}"`,
            `"${pincode}"`,
            `"${prodName}"`,
            `"${sku}"`,
            qty,
            price,
            `"${paymentMethod}"`,
            weightKg,
            len,
            breadth,
            height,
          ]
          csvLines.push(row.join(','))
        }
      }

      // Download CSV
      const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const downloadUrl = URL.createObjectURL(csvBlob)
      const link = document.createElement('a')
      link.href = downloadUrl
      const today = new Date().toISOString().split('T')[0]
      link.setAttribute('download', `shiprocket_orders_${today}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      setFeedback({
        type: 'success',
        text: `Exported ${eligible.length} ready-to-ship order(s) into Shiprocket bulk CSV format!`,
      })
      setTimeout(() => setFeedback(null), 6000)
    } catch (err) {
      console.error('Shiprocket export error:', err)
      setFeedback({ type: 'error', text: err.message || 'Failed to export Shiprocket CSV' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white">Orders</h1>
          <p className="text-xs text-white/50 mt-1">
            Manage customer orders, view payment status, and export daily shipments.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportShiprocket}
            disabled={exporting || rows.length === 0}
            className="btn-gold !py-2 !px-4 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#c5a059]/10"
            title="Export all PAID & UNSHIPPED orders in Shiprocket bulk import CSV format"
          >
            {exporting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Preparing Shiprocket CSV…
              </>
            ) : (
              <>
                <Truck size={14} /> Export Ready-to-Ship Orders (Shiprocket CSV)
              </>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : feedback.type === 'info'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>{feedback.text}</span>
        </div>
      )}

      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-white/40">
          <tr>
            <th className="py-2">Order</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Status</th>
            <th className="text-right pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-white/10">
              <td className="py-3">
                <Link className="text-[#c5a059]" to={`${adminBase}/orders/${o.id}`}>
                  {o.orderNumber}
                </Link>
              </td>
              <td>{o.shippingEmail}</td>
              <td>{inr(o.total)}</td>
              <td>
                <StatusBadge value={o.paymentStatus} />
              </td>
              <td>
                <StatusBadge value={o.orderStatus} />
              </td>
              <td className="py-3 text-right pr-4">
                <Link
                  to={`${adminBase}/orders/${o.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 transition-colors"
                >
                  <Eye size={12} className="text-[#c5a059]" /> View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

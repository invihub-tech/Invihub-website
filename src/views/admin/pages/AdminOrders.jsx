import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import StatusBadge from '../../ui/StatusBadge'

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    api.adminOrders().then(setRows)
  }, [])
  return (
    <div>
      <h1 className="font-serif text-4xl">Orders</h1>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-white/40">
          <tr>
            <th className="py-2">Order</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Status</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

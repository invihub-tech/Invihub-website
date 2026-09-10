import { ORDER_STEPS, ORDER_STATUS_LABELS } from '../../config/orderStatus'

export default function OrderStatusTracker({ status }) {
  if (status === 'CANCELLED') {
    return <p className="text-sm text-red-400">This order was cancelled.</p>
  }
  const idx = Math.max(0, ORDER_STEPS.indexOf(status))
  return (
    <ol className="flex flex-wrap gap-2">
      {ORDER_STEPS.map((step, i) => (
        <li
          key={step}
          className={`rounded-md border px-3 py-1.5 text-xs uppercase tracking-wide ${
            i <= idx ? 'border-[#c5a059] text-[#c5a059]' : 'border-white/15 text-white/35'
          }`}
        >
          {ORDER_STATUS_LABELS[step]}
        </li>
      ))}
    </ol>
  )
}

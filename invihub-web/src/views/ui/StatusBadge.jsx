const styles = {
  PAID: 'bg-emerald-500/15 text-emerald-400',
  SUCCESSFUL: 'bg-emerald-500/15 text-emerald-400',
  PROCESSING: 'bg-amber-400/15 text-amber-300',
  SHIPPED: 'bg-sky-400/15 text-sky-300',
  PENDING: 'bg-orange-400/15 text-orange-300',
  ACTIVE: 'bg-emerald-500/15 text-emerald-400',
  DELIVERED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
  ARCHIVED: 'bg-white/10 text-white/45',
  FAILED: 'bg-red-500/15 text-red-400',
}

export default function StatusBadge({ value }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[value] || 'bg-white/10 text-white/60'}`}>
      {value}
    </span>
  )
}

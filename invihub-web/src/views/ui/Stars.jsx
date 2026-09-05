export function Stars({ value = 4.8 }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#c5a059]">
      {'★★★★★'}
      <span className="text-white/40">{Number(value).toFixed(1)}</span>
    </span>
  )
}

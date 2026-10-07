import { CheckCircle2, Clock, Wrench, PackageCheck, AlertCircle } from 'lucide-react'

export const CUSTOM_REQUEST_STAGES = [
  { key: 'NEW', label: 'Request Submitted', desc: 'Requirements received' },
  { key: 'REVIEWING', label: 'Technical Review', desc: 'Assessing 3D specs & printability' },
  { key: 'QUOTED', label: 'Quote Issued', desc: 'Pricing & estimated timeline ready' },
  { key: 'APPROVED', label: 'Approved & Scheduled', desc: 'Ready for print queue' },
  { key: 'IN_PRODUCTION', label: 'In Production', desc: 'Printing & finishing' },
  { key: 'COMPLETED', label: 'Completed', desc: 'Shipped or ready for pickup' },
]

export default function CustomRequestStatusTracker({ status = 'NEW' }) {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 text-red-700">
        <AlertCircle size={20} className="shrink-0" />
        <div>
          <h4 className="font-bold text-sm">Request Cancelled</h4>
          <p className="text-xs text-red-600 mt-0.5">This custom request has been closed or cancelled.</p>
        </div>
      </div>
    )
  }

  const currentIdx = Math.max(
    0,
    CUSTOM_REQUEST_STAGES.findIndex((s) => s.key === status),
  )

  return (
    <div className="w-full py-4">
      {/* Mobile Steps List */}
      <div className="sm:hidden space-y-3">
        {CUSTOM_REQUEST_STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = idx === currentIdx
          return (
            <div
              key={stage.key}
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                isCurrent
                  ? 'border-orange-400 bg-orange-50/70 text-orange-950 font-semibold'
                  : isDone
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                    : 'border-slate-200 bg-slate-50/50 text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isCurrent
                    ? 'bg-orange-500 text-white'
                    : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <div>
                <p className={isCurrent ? 'text-orange-700 font-bold' : isDone ? 'text-slate-800' : 'text-slate-500'}>
                  {stage.label}
                </p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">{stage.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Stepper */}
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute left-6 top-4 h-0.5 bg-orange-500 transition-all duration-500 -z-0"
            style={{
              width: `${(currentIdx / (CUSTOM_REQUEST_STAGES.length - 1)) * 100}%`,
            }}
          />

          {CUSTOM_REQUEST_STAGES.map((stage, idx) => {
            const isDone = idx < currentIdx
            const isCurrent = idx === currentIdx
            return (
              <div key={stage.key} className="relative z-10 flex flex-col items-center text-center max-w-[100px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                    isCurrent
                      ? 'bg-orange-500 text-white ring-4 ring-orange-100 scale-110'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-bold leading-tight ${
                    isCurrent
                      ? 'text-orange-600'
                      : isDone
                        ? 'text-slate-800'
                        : 'text-slate-400 font-normal'
                  }`}
                >
                  {stage.label}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 hidden md:block">
                  {stage.desc}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

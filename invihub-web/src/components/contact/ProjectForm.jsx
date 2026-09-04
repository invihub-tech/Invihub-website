import { useEffect } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { services } from '../../data/services'

export default function ProjectForm({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const onSubmit = (e) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const body = [
      `Name: ${data.get('name')}`,
      `Company: ${data.get('company') || '-'}`,
      `Email: ${data.get('email')}`,
      `Phone: ${data.get('phone') || '-'}`,
      `Service: ${data.get('service')}`,
      `Quantity: ${data.get('quantity') || '-'}`,
      `Timeline: ${data.get('timeline') || '-'}`,
      '',
      data.get('description'),
    ].join('\n')
    const href = `mailto:invihub@gmail.com?subject=${encodeURIComponent('Project Enquiry - INVIHUB')}&body=${encodeURIComponent(body)}`
    window.location.href = href
    onClose()
  }

  return (
    <div className="fixed inset-0 z-modal flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/80" aria-label="Close project form" onClick={onClose} />
      <div className="relative max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-t-modal border border-border bg-surface p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-modal sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-bold tracking-wide">START A PROJECT</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-text-secondary hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-xs text-text-muted uppercase tracking-wider">
            Name *
            <input required name="name" className="field-input mt-2" />
          </label>
          <label className="block text-xs text-text-muted uppercase tracking-wider">
            Company
            <input name="company" className="field-input mt-2" />
          </label>
          <label className="block text-xs text-text-muted uppercase tracking-wider">
            Email *
            <input required type="email" name="email" className="field-input mt-2" />
          </label>
          <label className="block text-xs text-text-muted uppercase tracking-wider">
            Phone
            <input name="phone" className="field-input mt-2" />
          </label>
          <label className="block text-xs text-text-muted uppercase tracking-wider">
            What do you need? *
            <select required name="service" className="field-input mt-2 bg-[#0A0A0A]" defaultValue="">
              <option value="" disabled>
                Select service
              </option>
              {services.map((s) => (
                <option key={s.number} value={s.title}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-text-muted uppercase tracking-wider">
            Project description *
            <textarea required name="description" className="field-input mt-2 h-auto min-h-[140px] py-3" />
          </label>
          <label className="block text-xs text-text-muted uppercase tracking-wider">
            Upload files
            <input name="files" type="file" multiple className="mt-2 block w-full text-sm text-text-secondary" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-xs text-text-muted uppercase tracking-wider">
              Expected quantity
              <input name="quantity" className="field-input mt-2" />
            </label>
            <label className="block text-xs text-text-muted uppercase tracking-wider">
              Target timeline
              <input name="timeline" className="field-input mt-2" />
            </label>
          </div>
          <button type="submit" className="btn-primary w-full mt-2">
            Submit Project
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

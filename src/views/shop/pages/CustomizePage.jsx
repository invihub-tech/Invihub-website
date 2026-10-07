import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Wrench, Upload, X, CheckCircle2, FileText, ChevronRight } from 'lucide-react'
import { api } from '../../../models/api'
import { supabase } from '../../../lib/supabase'

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'Resin', 'Other']
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Orange', 'Yellow', 'Grey', 'Custom']
const SERVICE_TYPES = [
  { value: 'READY_DESIGN', label: 'Print My Own Design (Upload File)' },
  { value: 'CUSTOM_DESIGN', label: 'Design + Print (describe what you need)' },
  { value: 'MODIFICATION', label: 'Modify an Existing Product' },
]

const MAX_FILES = 5
const MAX_FILE_MB = 50

function FilePill({ file, onRemove }) {
  const kb = (file.size / 1024).toFixed(0)
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <FileText size={13} className="text-orange-500 shrink-0" />
      <span className="min-w-0 truncate text-slate-700">{file.name}</span>
      <span className="shrink-0 text-slate-400">{kb} KB</span>
      <button type="button" onClick={onRemove} className="shrink-0 text-slate-400 hover:text-red-500 ml-1">
        <X size={13} />
      </button>
    </div>
  )
}

export default function CustomizePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [product, setProduct] = useState(null)
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceType: 'READY_DESIGN',
    material: 'PLA',
    color: 'Black',
    quantity: 1,
    requirements: '',
  })

  const productSlug = params.get('product') || ''
  const initialParts = (() => {
    try {
      const p = params.get('parts')
      return p ? JSON.parse(p) : {}
    } catch {
      return {}
    }
  })()
  const [customParts, setCustomParts] = useState(initialParts)

  // Pre-fetch product if slug provided
  useEffect(() => {
    if (!productSlug) return
    api.product(productSlug).then(d => {
      setProduct(d?.product || d)
      if (d?.product?.parts?.length && Object.keys(initialParts).length === 0) {
        const init = {}
        d.product.parts.forEach(pt => {
          init[pt.name] = pt.allowedColors?.[0] || 'Black'
        })
        setCustomParts(init)
      }
    }).catch(() => {})
  }, [productSlug])

  // Pre-fill name+email if logged in
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const meta = data.session?.user?.user_metadata
      if (!meta) return
      setForm(f => ({
        ...f,
        customerName: f.customerName || meta.name || '',
        customerEmail: f.customerEmail || data.session?.user?.email || '',
        customerPhone: f.customerPhone || meta.phone || '',
      }))
    })
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleFiles(e) {
    const picked = Array.from(e.target.files || [])
    const valid = picked.filter(f => f.size <= MAX_FILE_MB * 1024 * 1024)
    if (valid.length < picked.length) alert(`Some files exceed ${MAX_FILE_MB} MB and were skipped.`)
    setFiles(prev => {
      const combined = [...prev, ...valid]
      return combined.slice(0, MAX_FILES)
    })
    e.target.value = ''
  }

  async function uploadToSupabase(file, requestId) {
    if (!supabase) return null
    const ext = file.name.split('.').pop() || 'bin'
    const path = `${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('customizations').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
    })
    if (error) {
      console.error('File upload error:', error.message)
      return null
    }
    // Bucket is private — do NOT call getPublicUrl.
    // The edge function generates short-lived signed URLs on retrieval.
    return {
      fileName: file.name,
      fileType: file.type || '',
      fileSize: file.size,
      storagePath: path,
      url: '', // will be populated as a signed URL by the backend
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.customerName.trim() || !form.customerEmail.trim()) {
      setError('Name and email are required.')
      return
    }
    setSubmitting(true)
    try {
      // Upload files first (use a temp ID for storage path)
      let uploadedFiles = []
      const tempId = `tmp-${Date.now().toString(36)}`
      if (files.length > 0 && supabase) {
        const uploads = await Promise.all(files.map(f => uploadToSupabase(f, tempId)))
        uploadedFiles = uploads.filter(Boolean)
      }

      // Single API call with file metadata included
      const result = await api.submitCustomRequest({
        ...form,
        quantity: Number(form.quantity) || 1,
        productId: product?.id || null,
        printingRequirements: Object.keys(customParts).length > 0 ? { parts: customParts } : {},
        files: uploadedFiles,
      })

      setSuccess(result)
    } catch (e) {
      setError(e.message || 'Could not submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-20 px-4 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h1>
        <p className="text-slate-500 mb-1">Your custom request has been received.</p>
        <div className="my-4 rounded-xl border border-orange-200 bg-orange-50 px-6 py-4 inline-block">
          <p className="text-xs text-slate-500 mb-1">Your Reference Number</p>
          <p className="font-mono text-orange-600 text-lg font-bold tracking-widest">{success.requestNumber}</p>
          <p className="text-[11px] text-slate-400 mt-1">Save this — you'll need it to track your request</p>
        </div>
        <p className="text-slate-500 text-sm mb-8">
          We'll review your requirements and get back to you with a quotation within 1–2 business days.
          Keep an eye on the email you provided.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/shop" className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition">
            Continue Shopping
          </Link>
          <Link to="/shop/account" className="rounded-lg border border-orange-300 bg-orange-50 px-6 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition">
            Track this Request →
          </Link>
          {productSlug && (
            <Link to={`/shop/product/${productSlug}`} className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              Back to Product
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-xs text-slate-400">
        <Link to="/shop" className="hover:text-slate-700">Shop</Link>
        <ChevronRight size={12} />
        {product && <><Link to={`/shop/product/${product.slug}`} className="hover:text-slate-700">{product.name}</Link><ChevronRight size={12} /></>}
        <span className="text-slate-700">Custom Request</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
          <Wrench size={20} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {product ? `Customize: ${product.name}` : 'Custom Print Request'}
          </h1>
          <p className="text-sm text-slate-500">Fill in your requirements and upload any reference files.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact */}
        <fieldset className="rounded-xl border border-slate-200 p-5 space-y-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Your Details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Full Name *</label>
              <input
                required
                value={form.customerName}
                onChange={e => set('customerName', e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Email *</label>
              <input
                required
                type="email"
                value={form.customerEmail}
                onChange={e => set('customerEmail', e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Phone (optional)</label>
            <input
              type="tel"
              value={form.customerPhone}
              onChange={e => set('customerPhone', e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            />
          </div>
        </fieldset>

        {/* Print Details */}
        <fieldset className="rounded-xl border border-slate-200 p-5 space-y-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Print Details</legend>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Service Type *</label>
            <div className="space-y-2">
              {SERVICE_TYPES.map(s => (
                <label key={s.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${form.serviceType === s.value ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input
                    type="radio"
                    name="serviceType"
                    value={s.value}
                    checked={form.serviceType === s.value}
                    onChange={() => set('serviceType', s.value)}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Material</label>
              <select
                value={form.material}
                onChange={e => set('material', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-orange-400 focus:outline-none"
              >
                {MATERIALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Color</label>
              <select
                value={form.color}
                onChange={e => set('color', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-orange-400 focus:outline-none"
              >
                {COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-orange-400 focus:outline-none"
              />
            </div>
          </div>

          {/* If multi-part colors are configured */}
          {Object.keys(customParts).length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Configured Part Colors:
                </span>
                <span className="text-[10px] font-semibold text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                  Multi-Part 3D Print
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {Object.entries(customParts).map(([partName, col]) => (
                  <div key={partName} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-700">{partName}:</span>
                    <span className="font-bold text-orange-600">{col}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </fieldset>

        {/* Requirements */}
        <fieldset className="rounded-xl border border-slate-200 p-5 space-y-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Requirements</legend>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Describe your requirements *
            </label>
            <textarea
              rows={5}
              required
              value={form.requirements}
              onChange={e => set('requirements', e.target.value)}
              placeholder="Describe what you need: dimensions, purpose, finish quality, reference images, any special requirements…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 resize-none"
            />
          </div>
        </fieldset>

        {/* File Upload */}
        <fieldset className="rounded-xl border border-slate-200 p-5 space-y-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Files (optional — up to {MAX_FILES})
          </legend>
          <p className="text-xs text-slate-500">STL, OBJ, CAD, images, PDFs — max {MAX_FILE_MB} MB each</p>
          {files.map((f, i) => (
            <FilePill key={i} file={f} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
          ))}
          {files.length < MAX_FILES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-orange-400 hover:text-orange-600 transition w-full justify-center"
            >
              <Upload size={15} /> Attach Files
            </button>
          )}
          <input ref={fileRef} type="file" multiple accept="*/*" className="hidden" onChange={handleFiles} />
        </fieldset>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-orange-500 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600 transition disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit Custom Request →'}
        </button>
        <p className="text-center text-xs text-slate-400">
          We'll review and send you a quote within 1–2 business days.
        </p>
      </form>
    </div>
  )
}

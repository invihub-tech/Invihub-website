import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wrench,
  Upload,
  X,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  Layers,
  Sparkles,
  ShieldCheck,
  Truck,
  Clock,
  HelpCircle,
  Check,
  FileCode,
  AlertCircle,
} from 'lucide-react'
import { api } from '../../../models/api'
import { supabase } from '../../../lib/supabase'

const MATERIALS = [
  { id: 'PLA', name: 'PLA (Standard Prototyping)', desc: 'Fast, accurate, cost-effective for general parts' },
  { id: 'PETG', name: 'PETG (Durable & Weatherproof)', desc: 'Strong, heat-resistant, chemical-safe' },
  { id: 'ABS', name: 'ABS (High-Impact & Heat)', desc: 'Tough, temperature resistant up to 90°C' },
  { id: 'TPU', name: 'TPU (Flexible Rubber)', desc: 'Bendable, shock-absorbing, gaskets & bumpers' },
  { id: 'Resin', name: 'Resin / SLA (Ultra-High Detail)', desc: 'Smooth injection-like finish, miniature accuracy' },
  { id: 'Carbon Fiber', name: 'Carbon Fiber Reinforced', desc: 'Ultra-stiff, lightweight, matte black finish' },
  { id: 'Other', name: 'Other / Need Engineering Advice', desc: 'Our team will recommend the optimal material' },
]

const COLORS = [
  'Black',
  'White',
  'Grey',
  'Engineering Orange',
  'Cobalt Blue',
  'Fire Red',
  'Forest Green',
  'Yellow',
  'Custom / Multi-Color',
]

const FINISHING_OPTIONS = [
  { id: 'Basic', label: 'Basic Finishing', desc: 'Support removal & edge deburring (Included)' },
  { id: 'Sanding', label: 'Sanding & Smoothing', desc: 'Minimizes layer lines for a refined finish' },
  { id: 'Painting', label: 'Primer & Painting', desc: 'Custom surface color match and protective coat' },
  { id: 'Assembly', label: 'Assembly & Hardware', desc: 'M3/M4 brass threaded inserts or multi-part bonding' },
]

const MAX_FILE_MB = 50

export default function Custom3DPrintingPage() {
  const modelFileRef = useRef(null)
  const imageFileRef = useRef(null)

  const [has3DFile, setHas3DFile] = useState(true)
  const [modelFiles, setModelFiles] = useState([])
  const [imageFiles, setImageFiles] = useState([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    material: 'PLA',
    color: 'Black',
    quantity: 1,
    length: '',
    width: '',
    height: '',
    unit: 'mm',
    finishing: ['Basic'],
    additionalRequirements: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    cityPincode: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const meta = data.session?.user?.user_metadata
      if (!meta) return
      setForm((f) => ({
        ...f,
        customerName: f.customerName || meta.name || '',
        customerEmail: f.customerEmail || data.session?.user?.email || '',
        customerPhone: f.customerPhone || meta.phone || '',
      }))
    })
  }, [])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const toggleFinishing = (id) => {
    setForm((f) => {
      const exists = f.finishing.includes(id)
      return {
        ...f,
        finishing: exists ? f.finishing.filter((x) => x !== id) : [...f.finishing, id],
      }
    })
  }

  const handleModelFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    const valid = picked.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
    if (valid.length < picked.length) {
      alert(`Some files exceed the ${MAX_FILE_MB}MB size limit and were skipped.`)
    }
    setModelFiles((prev) => [...prev, ...valid].slice(0, 5))
    e.target.value = ''
  }

  const handleImageFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    const valid = picked.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
    if (valid.length < picked.length) {
      alert(`Some images exceed the ${MAX_FILE_MB}MB size limit and were skipped.`)
    }
    setImageFiles((prev) => [...prev, ...valid].slice(0, 5))
    e.target.value = ''
  }

  async function uploadFile(file, tempId, category) {
    if (!supabase) return null
    const ext = file.name.split('.').pop() || 'bin'
    const storagePath = `${tempId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage.from('customizations').upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
    })
    if (upErr) return null
    const { data: urlData } = supabase.storage.from('customizations').getPublicUrl(storagePath)
    return {
      fileName: file.name,
      fileType: file.type || ext,
      fileSize: file.size,
      fileCategory: category,
      storagePath,
      url: urlData?.publicUrl || '',
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.customerName.trim() || !form.customerEmail.trim()) {
      setError('Please provide your name and email address.')
      return
    }

    if (!form.description.trim() && !form.title.trim()) {
      setError('Please provide a brief description of what you want printed.')
      return
    }

    if (has3DFile && modelFiles.length === 0) {
      setError('Please attach at least one 3D design file (or switch to "I don\'t have a 3D file").')
      return
    }

    setSubmitting(true)

    try {
      const tempId = `print-${Date.now().toString(36)}`
      const allUploads = []

      // Upload model files
      for (const f of modelFiles) {
        allUploads.push(uploadFile(f, tempId, '3d_model'))
      }

      // Upload reference images
      for (const f of imageFiles) {
        allUploads.push(uploadFile(f, tempId, 'reference_image'))
      }

      const uploadedFiles = (await Promise.all(allUploads)).filter(Boolean)

      const payload = {
        serviceType: has3DFile ? 'CUSTOM_3D_PRINTING' : 'DESIGN_FROM_SCRATCH',
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        material: form.material,
        color: form.color,
        quantity: Math.max(1, Number(form.quantity) || 1),
        requirements: [
          form.title ? `Project: ${form.title}` : '',
          form.description ? `Description: ${form.description}` : '',
          form.additionalRequirements ? `Additional Notes: ${form.additionalRequirements}` : '',
          form.cityPincode ? `Delivery Area: ${form.cityPincode}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        dimensions: {
          length: form.length ? `${form.length} ${form.unit}` : '',
          width: form.width ? `${form.width} ${form.unit}` : '',
          height: form.height ? `${form.height} ${form.unit}` : '',
        },
        finishing: form.finishing,
        printingRequirements: {
          has3DFile,
          unit: form.unit,
          dimensionsRaw: { length: form.length, width: form.width, height: form.height },
        },
        files: uploadedFiles,
      }

      const res = await api.submitCustomRequest(payload)
      setSuccess(res)
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
          Request Received
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
          Your 3D Printing Request is In!
        </h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto mb-4">
          Our engineering lab will inspect your specifications, run slicing estimates, and email you an itemized quotation.
        </p>

        <div className="my-6 inline-block bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Reference Tracking Number
          </div>
          <div className="font-mono text-xl font-bold text-[#f97316]">
            {success.requestNumber || 'REQ-CONFIRMED'}
          </div>
        </div>

        {/* Timeline */}
        <div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4 mb-8 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            What happens next?
          </h2>
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-[#f97316]">
                1
              </span>
              <div>
                <strong className="text-slate-800">File &amp; Geometry Review</strong>
                <p className="text-slate-500 text-[11px]">We check wall thickness, orientation, and tolerances.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-[#f97316]">
                2
              </span>
              <div>
                <strong className="text-slate-800">Formal Quotation within 24 Hours</strong>
                <p className="text-slate-500 text-[11px]">You will receive an email with cost, print time, and payment link.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-[#f97316]">
                3
              </span>
              <div>
                <strong className="text-slate-800">Production &amp; Dispatch</strong>
                <p className="text-slate-500 text-[11px]">Printed on calibrated industrial machines and delivered pan-India.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/shop" className="btn-shop-primary px-6 py-3 text-xs font-bold">
            Return to Shop
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccess(null)
              setModelFiles([])
              setImageFiles([])
              setForm((f) => ({ ...f, title: '', description: '', additionalRequirements: '' }))
            }}
            className="btn-shop-outline px-6 py-3 text-xs font-bold"
          >
            Submit Another Request
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/shop" className="hover:text-slate-700">Shop</Link>
        <ChevronRight size={12} />
        <span className="text-slate-700 font-medium">Custom 3D Printing</span>
      </nav>

      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,#ea580c25,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#f97316] text-xs font-bold uppercase tracking-wider">
            <Sparkles size={13} />
            <span>On-Demand Manufacturing Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Custom 3D Printing Service
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Have a custom part, 3D model, enclosure, or prototype you need manufactured? Upload your CAD files or describe your idea. INVIHUB delivers precision 3D prints directly to your doorstep.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Industrial Accuracy
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-orange-400" />
              Quotes in 24h
            </span>
            <span className="flex items-center gap-1.5">
              <Truck size={14} className="text-blue-400" />
              Pan-India Express Dispatch
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
        {/* Step 1: Design File Mode Toggle */}
        <div className="space-y-3">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Step 1: Choose Your Submission Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHas3DFile(true)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                has3DFile
                  ? 'border-[#f97316] bg-orange-50/70 shadow-sm ring-1 ring-orange-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${has3DFile ? 'bg-[#f97316] text-white' : 'bg-slate-100 text-slate-600'}`}>
                <FileCode size={20} />
              </div>
              <div>
                <strong className="block text-sm font-bold text-slate-900">I have a 3D CAD File</strong>
                <span className="text-xs text-slate-500">
                  Upload ready-to-slice files (STL, STEP, OBJ, 3MF, ZIP)
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setHas3DFile(false)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                !has3DFile
                  ? 'border-[#f97316] bg-orange-50/70 shadow-sm ring-1 ring-orange-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${!has3DFile ? 'bg-[#f97316] text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Wrench size={20} />
              </div>
              <div>
                <strong className="block text-sm font-bold text-slate-900">I don't have a 3D File</strong>
                <span className="text-xs text-slate-500">
                  Provide reference images, dimensions &amp; description; we design &amp; print
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Upload Files */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Step 2: Upload Files &amp; References
          </label>

          {/* 3D Model Uploader (if has3DFile) */}
          {has3DFile && (
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-800">
                Upload Your 3D Design File <span className="text-red-500">*</span>
              </span>
              <div
                onClick={() => modelFileRef.current?.click()}
                className="border-2 border-dashed border-orange-300 hover:border-orange-500 rounded-xl p-6 text-center cursor-pointer bg-orange-50/30 hover:bg-orange-50/60 transition group"
              >
                <input
                  ref={modelFileRef}
                  type="file"
                  multiple
                  accept=".stl,.step,.stp,.obj,.3mf,.zip"
                  onChange={handleModelFiles}
                  className="hidden"
                />
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 group-hover:scale-105 transition-transform">
                  <Upload size={22} className="text-[#f97316]" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Click or drag files here to upload your 3D design
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supported formats: <strong>STL, STEP, STP, OBJ, 3MF, ZIP</strong> (Max 50MB per file)
                </p>
              </div>

              {/* Uploaded model pills */}
              {modelFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {modelFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs"
                    >
                      <FileCode size={14} className="text-[#f97316]" />
                      <span className="font-medium text-slate-800">{f.name}</span>
                      <span className="text-[10px] text-slate-400">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                      <button
                        type="button"
                        onClick={() => setModelFiles((arr) => arr.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reference Images (Both modes) */}
          <div className="space-y-2 pt-2">
            <span className="block text-xs font-bold text-slate-800">
              Reference Images &amp; Sketches {has3DFile ? '(Optional)' : '<span class="text-orange-600 font-semibold">(Recommended)</span>'}
            </span>
            <div
              onClick={() => imageFileRef.current?.click()}
              className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition"
            >
              <input
                ref={imageFileRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleImageFiles}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-600">
                <ImageIcon size={16} className="text-slate-400" />
                <span>Upload photos, hand sketches, technical drawings, or screenshots (PNG, JPG, PDF)</span>
              </div>
            </div>

            {/* Uploaded image pills */}
            {imageFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {imageFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm"
                  >
                    <ImageIcon size={14} className="text-slate-500" />
                    <span className="font-medium text-slate-700">{f.name}</span>
                    <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setImageFiles((arr) => arr.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-500 ml-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Project Description */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Step 3: What Do You Want To Print?
          </label>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project / Part Name
              </label>
              <input
                type="text"
                placeholder="e.g. Custom Raspberry Pi Enclosure, Drone Arm Mount, Robotic Gripper"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description &amp; Use-Case <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe how the part will be used, whether it needs to withstand outdoor weather, heat, mechanical impact, or fit specific components..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Material, Color, Quantity & Dimensions */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Step 4: Material, Color &amp; Dimensions
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Material */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Material Choice
              </label>
              <select
                value={form.material}
                onChange={(e) => set('material', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-orange-500 focus:outline-none"
              >
                {MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {MATERIALS.find((m) => m.id === form.material)?.desc}
              </p>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Desired Color
              </label>
              <select
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-orange-500 focus:outline-none"
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Need multi-color parts? Specify in additional requirements.
              </p>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Discounts apply automatically for batch orders (10+ units).
              </p>
            </div>
          </div>

          {/* Dimensions */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Estimated Dimensions (Length × Width × Height)
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => set('unit', 'mm')}
                  className={`px-2 py-0.5 rounded ${form.unit === 'mm' ? 'bg-[#f97316] text-white' : 'text-slate-500 bg-white border'}`}
                >
                  mm
                </button>
                <button
                  type="button"
                  onClick={() => set('unit', 'cm')}
                  className={`px-2 py-0.5 rounded ${form.unit === 'cm' ? 'bg-[#f97316] text-white' : 'text-slate-500 bg-white border'}`}
                >
                  cm
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Length ({form.unit})</label>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={form.length}
                  onChange={(e) => set('length', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Width ({form.unit})</label>
                <input
                  type="number"
                  placeholder="e.g. 80"
                  value={form.width}
                  onChange={(e) => set('width', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Height ({form.unit})</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={form.height}
                  onChange={(e) => set('height', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Post-Processing & Finishing */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Step 5: Finishing &amp; Post-Processing Options
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FINISHING_OPTIONS.map((opt) => {
              const checked = form.finishing.includes(opt.id)
              return (
                <label
                  key={opt.id}
                  onClick={() => toggleFinishing(opt.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    checked
                      ? 'border-orange-400 bg-orange-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    className="mt-0.5 accent-[#f97316] shrink-0"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">{opt.label}</span>
                    <span className="text-[11px] text-slate-500">{opt.desc}</span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Step 6: Additional Requirements */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Step 6: Additional Technical Requirements (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Infill percentage (e.g. 20% or 100% solid), strict tolerances, deadline, brass insert sizes (M3/M4), or assembly instructions..."
            value={form.additionalRequirements}
            onChange={(e) => set('additionalRequirements', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Step 7: Contact Information */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Step 7: Your Contact Information
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={form.customerName}
                onChange={(e) => set('customerName', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (for Quotation) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={form.customerEmail}
                onChange={(e) => set('customerEmail', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone / WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.customerPhone}
                onChange={(e) => set('customerPhone', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City &amp; Pincode (for Shipping Estimate)
              </label>
              <input
                type="text"
                placeholder="e.g. Bangalore, 560001"
                value={form.cityPincode}
                onChange={(e) => set('cityPincode', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-shop-primary py-4 text-sm font-bold shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Uploading Files &amp; Submitting Request...</span>
              </>
            ) : (
              <>
                <span>Submit Custom 3D Printing Request</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            No upfront payment required. You will receive an official review and quotation before confirming.
          </p>
        </div>
      </form>
    </main>
  )
}

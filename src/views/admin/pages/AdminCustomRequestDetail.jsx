import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Download, FileText, CheckCircle2,
  Clock, Send, AlertCircle, Printer,
} from 'lucide-react'
import { api, inr } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'

const STATUS_OPTIONS = [
  'NEW', 'REVIEWING', 'QUOTED', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED',
]

const STATUS_COLORS = {
  NEW: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  REVIEWING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  QUOTED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  APPROVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  IN_PRODUCTION: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/30',
  CANCELLED: 'bg-red-500/20 text-red-300 border-red-500/30',
}

function Field({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <dt className="text-xs text-white/40">{label}</dt>
      <dd className="mt-0.5 text-sm text-white">{value}</dd>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-4 text-sm font-medium text-white/60 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

export default function AdminCustomRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Editable fields
  const [status, setStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  // Quotation fields
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteLeadDays, setQuoteLeadDays] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [showQuoteForm, setShowQuoteForm] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.adminCustomRequest(id)
      setRequest(data)
      setStatus(data.status)
      setAdminNotes(data.adminNotes || '')
      const q = data.quotation || {}
      setQuotePrice(q.price != null ? String(q.price) : '')
      setQuoteLeadDays(q.leadDays != null ? String(q.leadDays) : '')
      setQuoteNotes(q.notes || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.adminUpdateCustomRequest(id, {
        status,
        admin_notes: adminNotes,
      })
      setRequest(updated)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendQuote() {
    if (!quotePrice) { alert('Enter a price'); return }
    setSaving(true)
    try {
      const quotation = {
        price: Number(quotePrice),
        leadDays: Number(quoteLeadDays) || 7,
        notes: quoteNotes,
        sentAt: new Date().toISOString(),
      }
      const updated = await api.adminUpdateCustomRequest(id, {
        status: 'QUOTED',
        quotation_json: JSON.stringify(quotation),
      })
      setRequest(updated)
      setStatus('QUOTED')
      setShowQuoteForm(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handlePrintSheet() {
    if (!request) return
    const content = `
INVIHUB – Custom Print Production Sheet
========================================
Request #:    ${request.requestNumber}
Date:         ${new Date(request.createdAt).toLocaleString('en-IN')}
Status:       ${request.status}

CUSTOMER
--------
Name:    ${request.customerName}
Email:   ${request.customerEmail}
Phone:   ${request.customerPhone || '—'}

PRINT DETAILS
-------------
Product:      ${request.product?.name || 'General Custom Request'}
Service Type: ${request.serviceType}
Material:     ${request.material}
Color:        ${request.color}
Quantity:     ${request.quantity}

REQUIREMENTS
------------
${request.requirements || '(none)'}

ADMIN NOTES
-----------
${request.adminNotes || '(none)'}

${request.quotation?.price != null ? `QUOTATION\n---------\nPrice:     ₹${request.quotation.price}\nLead:      ${request.quotation.leadDays} days\nNotes:     ${request.quotation.notes || '—'}` : ''}

FILES (${(request.files || []).length})
------
${(request.files || []).map(f => `- ${f.fileName}  (${(f.fileSize / 1024).toFixed(1)} KB)\n  ${f.url}`).join('\n') || '(no files uploaded)'}
    `.trim()
    const w = window.open('', '_blank')
    w.document.write(`<html><body><pre style="font-family:monospace;white-space:pre-wrap;padding:2rem">${content}</pre></body></html>`)
    w.document.close()
    w.print()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent" />
    </div>
  )

  if (error) return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
      {error}
    </div>
  )

  if (!request) return null

  const q = request.quotation || {}

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`${adminBase}/custom-requests`)}
            className="rounded-md p-1.5 text-white/40 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{request.requestNumber}</h1>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[request.status] || 'bg-white/10 text-white/60 border-white/10'}`}>
                {request.status}
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              Submitted {new Date(request.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintSheet}
            className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            <Printer size={14} /> Production Sheet
          </button>
          {!showQuoteForm && (
            <button
              onClick={() => setShowQuoteForm(true)}
              className="flex items-center gap-2 rounded-md bg-[#c5a059]/10 border border-[#c5a059]/30 px-3 py-1.5 text-sm text-[#c5a059] hover:bg-[#c5a059]/20"
            >
              <Send size={14} /> Send Quote
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Request details */}
        <div className="space-y-4 lg:col-span-2">
          <Section title="Customer">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Name" value={request.customerName} />
              <Field label="Email" value={request.customerEmail} />
              <Field label="Phone" value={request.customerPhone || '—'} />
            </dl>
          </Section>

          <Section title="Print Details">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field
                label="Product / Scope"
                value={
                  request.product ? (
                    <span className="text-[#c5a059] font-medium">{request.product.name}</span>
                  ) : (
                    <span className="text-orange-400 font-semibold">Standalone 3D Printing Service</span>
                  )
                }
              />
              <Field label="Service Type" value={request.serviceType} />
              <Field label="Material" value={request.material} />
              <Field label="Color Preference" value={request.color} />
              <Field label="Quantity" value={request.quantity} />
              {request.dimensions && (request.dimensions.length || request.dimensions.width || request.dimensions.height) && (
                <Field
                  label="Dimensions (L × W × H)"
                  value={`${request.dimensions.length || '—'} × ${request.dimensions.width || '—'} × ${request.dimensions.height || '—'}`}
                />
              )}
            </dl>

            {/* Multi-Component Parts Breakdown */}
            {request.printingRequirements?.parts && Object.keys(request.printingRequirements.parts).length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs uppercase text-white/40 mb-2 font-bold tracking-wider">
                  Configured Part Colors:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(request.printingRequirements.parts).map(([partName, col]) => (
                    <div key={partName} className="bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs flex justify-between items-center">
                      <span className="text-white/70">{partName}:</span>
                      <strong className="text-[#c5a059]">{col}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finishing Options */}
            {Array.isArray(request.finishing) && request.finishing.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-xs uppercase text-white/40 mb-1.5 font-bold tracking-wider">
                  Finishing Options Selected:
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.finishing.map((f) => (
                    <span key={f} className="inline-block bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs px-2.5 py-1 rounded">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {request.requirements && (
            <Section title="Customer Requirements & Description">
              <p className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed">{request.requirements}</p>
            </Section>
          )}

          {/* Files */}
          <Section title={`Files (${(request.files || []).length})`}>
            {(request.files || []).length === 0 ? (
              <p className="text-sm text-white/30 italic">No files uploaded</p>
            ) : (
              <div className="space-y-2">
                {request.files.map(f => (
                  <div key={f.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-4 py-2">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-[#c5a059] shrink-0" />
                      <div>
                        <p className="text-sm text-white">{f.fileName}</p>
                        <p className="text-xs text-white/40">
                          {f.fileType} · {(f.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-[#c5a059] hover:underline"
                        download={f.fileName}
                      >
                        <Download size={13} /> Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Right: Admin actions */}
        <div className="space-y-4">
          {/* Status + Notes */}
          <Section title="Status & Notes">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/40">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/40">Internal Notes</label>
                <textarea
                  rows={4}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Notes visible only to admin team…"
                  className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c5a059] resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-md bg-[#c5a059] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4af6d] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </Section>

          {/* Quotation */}
          {showQuoteForm && (
            <Section title="Send Quotation">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-white/40">Price (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    value={quotePrice}
                    onChange={e => setQuotePrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Lead Time (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={quoteLeadDays}
                    onChange={e => setQuoteLeadDays(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Quote Notes</label>
                  <textarea
                    rows={3}
                    value={quoteNotes}
                    onChange={e => setQuoteNotes(e.target.value)}
                    placeholder="Pricing breakdown, conditions, etc."
                    className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c5a059] resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendQuote}
                    disabled={saving}
                    className="flex-1 rounded-md bg-[#c5a059] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4af6d] disabled:opacity-50"
                  >
                    {saving ? 'Sending…' : 'Confirm & Send Quote'}
                  </button>
                  <button
                    onClick={() => setShowQuoteForm(false)}
                    className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Section>
          )}

          {/* Show existing quote */}
          {q.price != null && !showQuoteForm && (
            <Section title="Quotation Sent">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Price</span>
                  <span className="font-mono text-[#c5a059] font-semibold">{inr(q.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Lead Time</span>
                  <span className="text-sm text-white">{q.leadDays || '—'} days</span>
                </div>
                {q.notes && (
                  <p className="text-xs text-white/50 mt-2 border-t border-white/10 pt-2">{q.notes}</p>
                )}
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="mt-2 text-xs text-[#c5a059] hover:underline"
                >
                  Update quote
                </button>
              </div>
            </Section>
          )}

          {/* Timeline hint */}
          <Section title="Workflow">
            {['NEW', 'REVIEWING', 'QUOTED', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED'].map((s, i) => {
              const done = STATUS_OPTIONS.indexOf(request.status) > STATUS_OPTIONS.indexOf(s)
              const current = request.status === s
              return (
                <div key={s} className="flex items-center gap-2 py-1">
                  {done ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : current ? (
                    <Clock size={14} className="text-[#c5a059] shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0" />
                  )}
                  <span className={`text-xs ${current ? 'text-[#c5a059] font-medium' : done ? 'text-white/50' : 'text-white/25'}`}>
                    {s}
                  </span>
                </div>
              )
            })}
          </Section>
        </div>
      </div>
    </div>
  )
}

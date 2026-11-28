import { useEffect, useState, useMemo } from 'react'
import {
  Truck,
  Settings,
  Table,
  Calculator,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Box,
  Layers,
  MapPin,
  Clock,
  Percent,
  Check,
  ShieldAlert,
} from 'lucide-react'
import { api, inr } from '../../../models/api'

export default function AdminShippingSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', text: '' }

  // Section A: Global Settings
  const [globalSettings, setGlobalSettings] = useState({
    enableFreeShipping: true,
    freeShippingMinCart: 599,
    packagingBufferGrams: 80,
    warehousePinPrefix: '56',
  })

  // Section B: Zone Rate Cards
  const [rateCards, setRateCards] = useState([])

  // Section C: Live Simulator State
  const [simPin, setSimPin] = useState('560001')
  const [simWeightGrams, setSimWeightGrams] = useState(650)
  const [simLength, setSimLength] = useState(15)
  const [simWidth, setSimWidth] = useState(10)
  const [simHeight, setSimHeight] = useState(10)
  const [simCartSubtotal, setSimCartSubtotal] = useState(450)

  // Load Shipping Settings
  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await api.adminShippingSettings()
      if (data?.globalSettings) {
        setGlobalSettings(data.globalSettings)
      }
      if (data?.rateCards?.length) {
        setRateCards(data.rateCards)
      }
    } catch (err) {
      console.error('Failed to load shipping settings:', err)
      setFeedback({ type: 'error', text: err.message || 'Failed to load shipping settings' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  // Update a single field in globalSettings
  const setGlobal = (field, val) => {
    setGlobalSettings((prev) => ({ ...prev, [field]: val }))
  }

  // Update a field in a specific rate card
  const updateRateCard = (id, field, val) => {
    setRateCards((prev) =>
      prev.map((rc) => (rc.id === id ? { ...rc, [field]: val } : rc))
    )
  }

  // Save all changes
  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      await api.adminUpdateShippingSettings({
        globalSettings,
        rateCards,
      })
      setFeedback({
        type: 'success',
        text: 'Shipping rules and rate cards saved successfully!',
      })
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      console.error('Failed to save shipping settings:', err)
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to save rate cards',
      })
    } finally {
      setSaving(false)
    }
  }

  // Simulator calculation logic (Exact algorithm matching specification)
  const simResult = useMemo(() => {
    const subtotal = Number(simCartSubtotal || 0)
    const deadWeight = Number(simWeightGrams || 0)
    const buffer = Number(globalSettings.packagingBufferGrams || 0)
    const totalActualGrams = deadWeight + buffer

    // Volumetric weight: (L * W * H / 5000) * 1000
    const l = Number(simLength || 0)
    const w = Number(simWidth || 0)
    const h = Number(simHeight || 0)
    const volGrams = l > 0 && w > 0 && h > 0 ? ((l * w * h) / 5000) * 1000 : 0

    const chargeableGrams = Math.max(totalActualGrams, volGrams)
    const chargeableKg = (chargeableGrams / 1000).toFixed(2)

    // Check Free Shipping Threshold
    const isFreeShipping =
      globalSettings.enableFreeShipping &&
      subtotal >= Number(globalSettings.freeShippingMinCart || 0)

    // Zone detection based on PIN prefix
    const pinStr = String(simPin || '').trim()
    const pinPrefix2 = pinStr.slice(0, 2)
    const originPrefix = String(globalSettings.warehousePinPrefix || '56').trim()

    let matchedZone = 'national'
    if (pinStr.length >= 2) {
      if (pinPrefix2 === originPrefix) {
        matchedZone = 'local'
      } else if (
        ['56', '57', '58', '59', '60', '61', '62', '63', '64'].includes(pinPrefix2)
      ) {
        // Southern Region example mapping
        matchedZone = 'regional'
      } else if (
        ['19', '18', '79', '78', '74'].includes(pinPrefix2) // J&K, Northeast, Islands
      ) {
        matchedZone = 'special_zone'
      } else {
        matchedZone = 'national'
      }
    }

    const card =
      rateCards.find(
        (rc) => rc.zoneCode?.toLowerCase() === matchedZone.toLowerCase()
      ) ||
      rateCards[0] || {
        base500gPrice: 45,
        additional500gPrice: 30,
        gstPercentage: 18,
        estimatedDays: '3-6 business days',
      }

    if (isFreeShipping) {
      return {
        isFree: true,
        zoneCode: matchedZone,
        zoneName: card.zoneName || matchedZone.toUpperCase(),
        estimatedDays: card.estimatedDays || '4-7 business days',
        chargeableGrams,
        chargeableKg,
        totalActualGrams,
        volGrams,
        slabs: 0,
        extraSlabs: 0,
        baseFreight: 0,
        gstAmount: 0,
        finalFee: 0,
      }
    }

    const totalSlabs = Math.max(1, Math.ceil(chargeableGrams / 500))
    const extraSlabs = totalSlabs - 1
    const baseFreight =
      Number(card.base500gPrice || 0) +
      extraSlabs * Number(card.additional500gPrice || 0)
    const gstAmount = (baseFreight * Number(card.gstPercentage || 18)) / 100
    const finalFee = Math.ceil(baseFreight + gstAmount)

    return {
      isFree: false,
      zoneCode: matchedZone,
      zoneName: card.zoneName || matchedZone.toUpperCase(),
      estimatedDays: card.estimatedDays || '3-6 business days',
      chargeableGrams,
      chargeableKg,
      totalActualGrams,
      volGrams,
      slabs: totalSlabs,
      extraSlabs,
      baseFreight,
      gstAmount,
      finalFee,
    }
  }, [
    simPin,
    simWeightGrams,
    simLength,
    simWidth,
    simHeight,
    simCartSubtotal,
    globalSettings,
    rateCards,
  ])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-white/50 text-sm">
        <Truck className="animate-bounce text-[#c5a059] mr-2" size={20} />
        Loading Shipping & Delivery Settings…
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-lg bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059]">
              <Truck size={24} />
            </span>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
                Shipping & Delivery Settings
              </h1>
              <p className="text-xs text-white/50 mt-1">
                Configure volumetric rates, weight slabs (500g), PIN code zones, and live delivery charges.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadSettings}
            className="btn-outline-white !py-2 !px-3 text-xs flex items-center gap-1.5"
            title="Reset to saved"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gold !py-2 !px-5 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#c5a059]/10"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Saving Changes…
              </>
            ) : (
              <>
                <Save size={14} /> Save Rate Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all ${feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-400" />
          )}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* SECTION A: GLOBAL RULES FORM */}
      <section className="rounded-xl border border-white/10 bg-[#121212] overflow-hidden shadow-sm">
        <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-[#c5a059]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Section A: Global Delivery Rules
            </h2>
          </div>
          <span className="text-[11px] text-white/40">Applies across all zones</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Free Shipping Toggle */}
          <div className="space-y-2 p-3.5 rounded-lg border border-white/5 bg-black/30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/80">
                Free Shipping Feature
              </label>
              <button
                type="button"
                onClick={() => setGlobal('enableFreeShipping', !globalSettings.enableFreeShipping)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${globalSettings.enableFreeShipping ? 'bg-[#c5a059]' : 'bg-white/20'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${globalSettings.enableFreeShipping ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-white/45">
              {globalSettings.enableFreeShipping
                ? 'Active: Orders above threshold get ₹0 delivery'
                : 'Disabled: All orders pay standard zone rates'}
            </p>
          </div>

          {/* Free Shipping Min Cart (₹) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/70">
              Free Shipping Threshold (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                disabled={!globalSettings.enableFreeShipping}
                className="field-input pl-7 text-xs font-medium"
                value={globalSettings.freeShippingMinCart}
                onChange={(e) => setGlobal('freeShippingMinCart', Math.max(0, Number(e.target.value)))}
                placeholder="599"
              />
            </div>
            <p className="text-[10px] text-white/40">Minimum cart subtotal to unlock free shipping</p>
          </div>

          {/* Packaging Buffer Weight (grams) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/70">
              Packaging Buffer Weight (g)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="5"
                className="field-input pr-8 text-xs font-medium"
                value={globalSettings.packagingBufferGrams}
                onChange={(e) => setGlobal('packagingBufferGrams', Math.max(0, Number(e.target.value)))}
                placeholder="80"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[11px]">g</span>
            </div>
            <p className="text-[10px] text-white/40">Added to product dead weight for box/tape/bubble wrap</p>
          </div>

          {/* Warehouse Origin PIN Prefix */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/70">
              Origin Warehouse PIN Prefix
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={4}
                className="field-input text-xs font-mono font-bold tracking-wider"
                value={globalSettings.warehousePinPrefix}
                onChange={(e) => setGlobal('warehousePinPrefix', e.target.value.trim())}
                placeholder="56"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c5a059] text-[10px] font-semibold uppercase">
                Local Base
              </span>
            </div>
            <p className="text-[10px] text-white/40">e.g. "56" for Karnataka / Bangalore local zone lookup</p>
          </div>
        </div>
      </section>

      {/* SECTION B: EDITABLE ZONE RATE TABLE */}
      <section className="rounded-xl border border-white/10 bg-[#121212] overflow-hidden shadow-sm">
        <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-[#c5a059]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Section B: Editable Zone Rate Cards (500g Slabs)
            </h2>
          </div>
          <span className="text-[11px] text-white/40">
            Calculated as: <code className="text-[#c5a059] bg-white/5 px-1 py-0.5 rounded">Base + (Extra Slabs × Addtl) + GST</code>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Zone</th>
                <th className="py-3 px-4 font-semibold">Coverage / Prefix Examples</th>
                <th className="py-3 px-4 font-semibold">Base 500g Rate (₹)</th>
                <th className="py-3 px-4 font-semibold">Addt'l 500g Rate (₹)</th>
                <th className="py-3 px-4 font-semibold">GST Rate (%)</th>
                <th className="py-3 px-4 font-semibold">Est. Delivery Timeline</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rateCards.map((rc) => (
                <tr key={rc.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Zone Name */}
                  <td className="py-3.5 px-4 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#c5a059]" />
                      <span>{rc.zoneName}</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono block pl-4">
                      code: {rc.zoneCode}
                    </span>
                  </td>

                  {/* Description / Coverage */}
                  <td className="py-3.5 px-4 text-white/60 text-[11px] max-w-[200px]">
                    {rc.description || 'All standard pincodes across India'}
                  </td>

                  {/* Base 500g Price */}
                  <td className="py-3.5 px-4">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="field-input !py-1.5 pl-6 text-xs font-semibold text-right"
                        value={rc.base500gPrice}
                        onChange={(e) => updateRateCard(rc.id, 'base500gPrice', Number(e.target.value))}
                      />
                    </div>
                  </td>

                  {/* Additional 500g Price */}
                  <td className="py-3.5 px-4">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="field-input !py-1.5 pl-6 text-xs font-semibold text-right"
                        value={rc.additional500gPrice}
                        onChange={(e) => updateRateCard(rc.id, 'additional500gPrice', Number(e.target.value))}
                      />
                    </div>
                  </td>

                  {/* GST Percentage */}
                  <td className="py-3.5 px-4">
                    <div className="relative w-24">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="field-input !py-1.5 pr-6 text-xs font-semibold text-right"
                        value={rc.gstPercentage ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '')
                          updateRateCard(rc.id, 'gstPercentage', val === '' ? '' : Number(val))
                        }}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[11px] select-none pointer-events-none">%</span>
                    </div>
                  </td>

                  {/* Estimated Days */}
                  <td className="py-3.5 px-4">
                    <input
                      type="text"
                      className="field-input !py-1.5 text-xs w-36"
                      value={rc.estimatedDays}
                      onChange={(e) => updateRateCard(rc.id, 'estimatedDays', e.target.value)}
                      placeholder="e.g. 2-4 days"
                    />
                  </td>

                  {/* Active Toggle */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => updateRateCard(rc.id, 'isActive', !rc.isActive)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${rc.isActive !== false
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                    >
                      {rc.isActive !== false ? <Check size={10} /> : null}
                      {rc.isActive !== false ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Log Note & Fast Save */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/40">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-[#c5a059]" />
            <span>All price updates are automatically logged with admin timestamp for audit records.</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gold !py-1.5 !px-4 text-xs font-medium self-end sm:self-auto"
          >
            {saving ? 'Saving Changes…' : 'Save Rate Changes'}
          </button>
        </div>
      </section>

      {/* SECTION C: LIVE RATE CALCULATOR & PREVIEW SIMULATOR */}
      <section className="rounded-xl border border-white/10 bg-[#121212] overflow-hidden shadow-sm">
        <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-[#c5a059]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Section C: Live Preview Simulator
            </h2>
          </div>
          <span className="text-[11px] text-white/40">
            Real-time test sandbox for backoffice staff to verify customer rates
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Simulator Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              1. Test Parameters
            </div>

            {/* Customer PIN Code */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-white/70">
                Customer Destination PIN Code
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  maxLength={6}
                  className="field-input pl-8 font-mono text-xs font-semibold tracking-wider"
                  value={simPin}
                  onChange={(e) => setSimPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="560001"
                />
              </div>
              <p className="text-[10px] text-white/40">
                Matches prefix "{simPin.slice(0, 2)}" against zone definitions
              </p>
            </div>

            {/* Cart Subtotal */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-white/70">
                Cart Items Subtotal (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="field-input pl-7 text-xs font-medium"
                  value={simCartSubtotal}
                  onChange={(e) => setSimCartSubtotal(Number(e.target.value))}
                  placeholder="450"
                />
              </div>
              <p className="text-[10px] text-white/40">
                Free shipping triggers at ≥ {inr(globalSettings.freeShippingMinCart || 0)}
              </p>
            </div>

            {/* Actual Dead Weight */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-white/70">
                Item Dead Weight (g)
              </label>
              <div className="relative">
                <Box size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="number"
                  min="1"
                  step="50"
                  className="field-input pl-8 pr-8 text-xs font-medium"
                  value={simWeightGrams}
                  onChange={(e) => setSimWeightGrams(Number(e.target.value))}
                  placeholder="650"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[11px]">g</span>
              </div>
              <p className="text-[10px] text-white/40">
                Buffer of {globalSettings.packagingBufferGrams}g will be added automatically
              </p>
            </div>

            {/* Package Dimensions (Volumetric) */}
            <div className="space-y-1 pt-1">
              <label className="block text-xs font-medium text-white/70">
                Package Dimensions: L × W × H (cm)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    className="field-input text-xs text-center pr-6"
                    value={simLength}
                    onChange={(e) => setSimLength(Number(e.target.value))}
                    placeholder="L"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px]">cm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    className="field-input text-xs text-center pr-6"
                    value={simWidth}
                    onChange={(e) => setSimWidth(Number(e.target.value))}
                    placeholder="W"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px]">cm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    className="field-input text-xs text-center pr-6"
                    value={simHeight}
                    onChange={(e) => setSimHeight(Number(e.target.value))}
                    placeholder="H"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px]">cm</span>
                </div>
              </div>
              <p className="text-[10px] text-white/40">
                Volumetric formula: <code>(L × W × H / 5000) × 1000g</code>
              </p>
            </div>
          </div>

          {/* Simulator Output Card */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-white/10 bg-black/40 p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  2. Calculation Breakdown
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#c5a059]">
                  Zone: {simResult.zoneName}
                </span>
              </div>

              {/* Step-by-Step Breakdown List */}
              <div className="mt-4 space-y-3 text-xs">
                {/* Weight Comparison */}
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-white/60">Actual Weight (with {globalSettings.packagingBufferGrams}g buffer):</span>
                  <span className="font-mono text-white/90">{simResult.totalActualGrams} g</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-white/60">Volumetric Weight ({simLength}×{simWidth}×{simHeight} cm):</span>
                  <span className="font-mono text-white/90">{Math.round(simResult.volGrams)} g</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/5 bg-white/[0.02] px-2 rounded">
                  <span className="font-medium text-white/90">Chargeable Weight (Higher of above):</span>
                  <span className="font-mono font-bold text-[#c5a059]">
                    {Math.round(simResult.chargeableGrams)} g ({simResult.chargeableKg} kg)
                  </span>
                </div>

                {/* Slabs */}
                {!simResult.isFree && (
                  <>
                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-white/60">500g Slab Count:</span>
                      <span className="font-mono text-white/90">
                        {simResult.slabs} slab(s) (1 Base + {simResult.extraSlabs} Additional)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-white/60">Base Freight:</span>
                      <span className="font-mono text-white/90">{inr(simResult.baseFreight, 2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-white/60">GST on Delivery (18%):</span>
                      <span className="font-mono text-white/90">{inr(simResult.gstAmount, 2)}</span>
                    </div>
                  </>
                )}

                {/* Estimated Timeline */}
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Clock size={12} className="text-white/40" /> Estimated Timeline:
                  </span>
                  <span className="font-medium text-white/90">{simResult.estimatedDays}</span>
                </div>
              </div>
            </div>

            {/* Final Big Total Display */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-white/[0.03] to-white/[0.06] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider block">
                  Customer Checkout Delivery Charge
                </span>
                <span className="text-xs text-white/60 mt-0.5 block">
                  {simResult.isFree ? (
                    <span className="text-emerald-400 font-medium">Free Shipping Applied (Cart ≥ {inr(globalSettings.freeShippingMinCart || 0)})</span>
                  ) : (
                    <span>Rounded to nearest rupee</span>
                  )}
                </span>
              </div>
              <div className="text-right">
                {simResult.isFree ? (
                  <span className="text-2xl font-bold text-emerald-400">FREE</span>
                ) : (
                  <span className="text-2xl font-bold font-mono text-[#c5a059]">
                    {inr(simResult.finalFee, 0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

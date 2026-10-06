import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../models/api'
import { User, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react'

export default function CheckoutChoice() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('choice')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })

  useEffect(() => {
    api.customerMe().then(() => navigate('/shop/checkout/details', { replace: true })).catch(() => {})
  }, [navigate])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const register = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await api.customerRegister(form)
      navigate('/shop/checkout/details')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  const login = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await api.customerLogin(form.email, form.password)
      navigate('/shop/checkout/details')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {/* Step indicator */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-6 pb-4 border-b border-slate-100">
          <span className="text-[#f97316]">① Customer</span>
          <span>→</span>
          <span>② Delivery</span>
          <span>→</span>
          <span>③ Payment</span>
          <span>→</span>
          <span>④ Confirmation</span>
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">How would you like to continue?</h1>
        <p className="mt-1 text-xs text-slate-500">
          You can check out quickly as a guest. Account creation is completely optional.
        </p>

        {mode === 'choice' && (
          <div className="mt-8 space-y-4">
            <Link
              to="/shop/checkout/details"
              className="btn-shop-primary w-full py-3 text-xs font-bold gap-2 shadow-md shadow-orange-950/20"
            >
              <span>Continue as Guest</span>
              <ArrowRight size={15} />
            </Link>

            <button
              type="button"
              className="btn-shop-outline w-full py-3 text-xs font-bold gap-2"
              onClick={() => setMode('register')}
            >
              <UserPlus size={15} />
              <span>Create an Account</span>
            </button>

            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 mb-3">Already have an INVIHUB account?</p>
              <button
                type="button"
                className="w-full py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                onClick={() => setMode('login')}
              >
                <User size={15} />
                <span>Sign In to Account</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <form onSubmit={register} className="mt-6 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                placeholder="Name"
                required
                value={form.name}
                onChange={set('name')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                type="email"
                placeholder="you@domain.com"
                required
                value={form.email}
                onChange={set('email')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                placeholder="+91 9876543210"
                required
                value={form.phone}
                onChange={set('phone')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                type="password"
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                value={form.password}
                onChange={set('password')}
              />
            </div>

            {err && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{err}</div>}

            <button className="btn-shop-primary w-full py-3 text-xs font-bold" disabled={busy} type="submit">
              {busy ? 'Creating Account…' : 'Register & Continue to Delivery'}
            </button>

            <button
              type="button"
              className="text-xs text-[#f97316] font-semibold block text-center w-full pt-1"
              onClick={() => setMode('choice')}
            >
              ← Back to options
            </button>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={login} className="mt-6 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                type="email"
                placeholder="you@domain.com"
                required
                value={form.email}
                onChange={set('email')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                type="password"
                placeholder="Enter password"
                required
                value={form.password}
                onChange={set('password')}
              />
            </div>

            {err && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{err}</div>}

            <button className="btn-shop-primary w-full py-3 text-xs font-bold" disabled={busy} type="submit">
              {busy ? 'Signing In…' : 'Sign In & Continue'}
            </button>

            <button
              type="button"
              className="text-xs text-[#f97316] font-semibold block text-center w-full pt-1"
              onClick={() => setMode('choice')}
            >
              ← Back to options
            </button>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Your customer data is encrypted and confidential</span>
        </div>
      </div>
    </main>
  )
}

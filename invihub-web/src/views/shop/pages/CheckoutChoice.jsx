import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../models/api'

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
    <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-serif text-4xl">How would you like to continue?</h1>
      <p className="mt-3 text-white/50">You can check out as a guest. An account is optional.</p>

      {mode === 'choice' && (
        <div className="mt-10 space-y-3">
          <Link to="/shop/checkout/details" className="btn-gold w-full">
            Continue as Guest
          </Link>
          <button type="button" className="btn-gold-outline w-full" onClick={() => setMode('register')}>
            Create Account
          </button>
          <p className="pt-4 text-center text-sm text-white/45">Already have an account?</p>
          <button type="button" className="btn-outline-white w-full" onClick={() => setMode('login')}>
            Login
          </button>
        </div>
      )}

      {mode === 'register' && (
        <form onSubmit={register} className="mt-8 space-y-3">
          <input className="field-input" placeholder="Name" required value={form.name} onChange={set('name')} />
          <input className="field-input" type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
          <input className="field-input" placeholder="Phone" required value={form.phone} onChange={set('phone')} />
          <input className="field-input" type="password" placeholder="Password" required minLength={6} value={form.password} onChange={set('password')} />
          {err && <p className="text-red-400">{err}</p>}
          <button className="btn-gold w-full" disabled={busy} type="submit">
            {busy ? 'Creating…' : 'Create Account'}
          </button>
          <button type="button" className="text-sm text-[#c5a059]" onClick={() => setMode('choice')}>
            ← Back
          </button>
        </form>
      )}

      {mode === 'login' && (
        <form onSubmit={login} className="mt-8 space-y-3">
          <input className="field-input" type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
          <input className="field-input" type="password" placeholder="Password" required value={form.password} onChange={set('password')} />
          {err && <p className="text-red-400">{err}</p>}
          <button className="btn-gold w-full" disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'Login'}
          </button>
          <button type="button" className="text-sm text-[#c5a059]" onClick={() => setMode('choice')}>
            ← Back
          </button>
        </form>
      )}
    </main>
  )
}

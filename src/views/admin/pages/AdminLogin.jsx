import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="admin-ui flex min-h-screen items-center justify-center bg-black px-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-md border border-white/10 bg-[#111] p-8 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault()
          setErr('')
          setLoading(true)
          try {
            await api.adminLogin(email.trim(), password)
            navigate(`${adminBase}/dashboard`)
          } catch (ex) {
            setErr(ex.message || 'Login failed. Please check your credentials.')
          } finally {
            setLoading(false)
          }
        }}
      >
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <img src="/images/logo.png" alt="INVIHUB" className="h-8 w-8 rounded-full bg-white object-contain" />
          <h1 className="font-serif text-2xl text-white">Admin Login</h1>
        </div>
        <input
          className="field-input w-full"
          type="email"
          autoComplete="username"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <input
          className="field-input w-full"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        {err && (
          <div className="rounded-md bg-red-950/60 border border-red-500/30 p-2.5 text-xs text-red-300">
            {err}
          </div>
        )}
        <button
          className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  return (
    <div className="admin-ui flex min-h-screen items-center justify-center bg-black px-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-md border border-white/10 bg-[#111] p-8"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api.adminLogin(email, password)
            navigate(`${adminBase}/dashboard`)
          } catch (ex) {
            setErr(ex.message)
          }
        }}
      >
        <h1 className="font-serif text-3xl">Admin Login</h1>
        <input className="field-input" type="email" autoComplete="username" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="field-input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="btn-gold w-full" type="submit">
          Sign in
        </button>
      </form>
    </div>
  )
}

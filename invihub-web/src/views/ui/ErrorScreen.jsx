import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const gold = 'bg-[#c5a059] text-black hover:bg-[#d4b06a]'
const outline = 'border border-white/20 text-white hover:border-white/40'

export default function ErrorScreen({
  code,
  title,
  message,
  showSearch = false,
  showRetry = false,
  onRetry,
  showLogin = false,
  showContact = false,
  extra,
}) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-16 text-center text-white">
      {code ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5a059]">{code}</p> : null}
      <h1 className="mt-3 font-serif text-4xl">{title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-white/55">{message}</p>

      {showSearch ? (
        <form
          className="mt-8 flex gap-2 rounded-md border border-white/15 px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(`/shop/products?q=${encodeURIComponent(q)}`)
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
          />
          <button type="submit" className={`shrink-0 rounded px-3 py-1 text-sm font-semibold ${gold}`}>
            Search
          </button>
        </form>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className={`rounded-md px-4 py-2 text-sm font-semibold ${gold}`}>
          Home
        </Link>
        <Link to="/shop" className={`rounded-md px-4 py-2 text-sm ${outline}`}>
          Shop
        </Link>
        {showLogin ? (
          <Link to="/shop/account" className={`rounded-md px-4 py-2 text-sm ${outline}`}>
            Log in
          </Link>
        ) : null}
        {showRetry ? (
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm ${outline}`}
            onClick={onRetry || (() => window.location.reload())}
          >
            Retry
          </button>
        ) : null}
        {showContact ? (
          <a href="/#contact" className={`rounded-md px-4 py-2 text-sm ${outline}`}>
            Contact support
          </a>
        ) : null}
        <Link to="/#about" className={`rounded-md px-4 py-2 text-sm ${outline}`}>
          About
        </Link>
      </div>
      {extra}
    </main>
  )
}

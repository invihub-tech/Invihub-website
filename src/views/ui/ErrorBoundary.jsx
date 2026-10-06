import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5a059]">Something went wrong</p>
        <h1 className="mt-3 font-serif text-4xl">This page failed to load</h1>
        <p className="mt-4 max-w-md text-sm text-white/55">Reload to try again. If it keeps happening, go back to the shop home.</p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            className="rounded-md bg-[#c5a059] px-4 py-2 text-sm font-semibold text-black"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <a href="/shop" className="rounded-md border border-white/20 px-4 py-2 text-sm">
            Shop
          </a>
        </div>
      </div>
    )
  }
}

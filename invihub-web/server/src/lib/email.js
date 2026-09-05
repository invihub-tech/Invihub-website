export const EmailService = {
  async send(event, payload) {
    console.log('[EmailService:mock]', event, payload?.to || payload?.email || payload)
    return { ok: true, provider: 'mock' }
  },
}

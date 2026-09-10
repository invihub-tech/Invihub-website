export function isDbUnreachable(err) {
  return err?.code === 'P1001' || /Can't reach database/i.test(String(err?.message || ''))
}

export function maintenanceGuard(req, res, next) {
  if (String(process.env.MAINTENANCE_MODE || '') !== 'true') return next()
  const path = req.originalUrl?.split('?')[0] || ''
  if (req.method === 'GET' && (path === '/api/health' || path === '/health')) return next()
  res.set('Retry-After', '3600')
  return res.status(503).json({
    error: 'The shop is temporarily down for maintenance.',
    maintenance: true,
  })
}

export function apiErrorHandler(err, _req, res, _next) {
  if (isDbUnreachable(err)) {
    console.error(err)
    return res.status(503).json({ error: 'Database is unreachable. Retry in a moment.' })
  }
  const status = Number(err.status || err.statusCode) || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: status >= 500 ? 'Server error' : err.message || 'Request failed' })
}

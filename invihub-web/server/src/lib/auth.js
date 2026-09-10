import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'
import { cookieOpts } from './security.js'

const SECRET = process.env.JWT_SECRET || 'dev-secret'
const loginAttempts = new Map()

function loginKey(req, email) {
  return `${req.ip}|${String(email || '').toLowerCase()}`
}

export function assertLoginAllowed(req, email) {
  const rec = loginAttempts.get(loginKey(req, email))
  if (rec && rec.count >= 8 && Date.now() - rec.first < 15 * 60 * 1000) {
    const err = new Error('Too many login attempts. Try again later.')
    err.status = 429
    throw err
  }
}

export function recordLoginFailure(req, email) {
  const k = loginKey(req, email)
  const rec = loginAttempts.get(k) || { count: 0, first: Date.now() }
  if (Date.now() - rec.first > 15 * 60 * 1000) {
    rec.count = 0
    rec.first = Date.now()
  }
  rec.count += 1
  loginAttempts.set(k, rec)
}

export function clearLoginFailures(req, email) {
  loginAttempts.delete(loginKey(req, email))
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export function signAdmin(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email, role: 'admin' }, SECRET, { expiresIn: '7d' })
}

export function signCustomer(customer) {
  return jwt.sign({ sub: customer.id, email: customer.email, role: 'customer' }, SECRET, { expiresIn: '30d' })
}

export function readToken(req) {
  const header = req.headers.authorization
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null
  const cookie = req.cookies?.admin_token
  return bearer || cookie
}

export function readCustomerToken(req) {
  const header = req.headers.authorization
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null
  return bearer || req.cookies?.customer_token
}

export function setCustomerCookie(res, token) {
  res.cookie('customer_token', token, cookieOpts(30 * 24 * 60 * 60 * 1000))
}

export function requireCustomer(req, res, next) {
  const token = readCustomerToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, SECRET)
    if (payload.role !== 'customer') return res.status(401).json({ error: 'Unauthorized' })
    req.customer = payload
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function optionalCustomer(req, _res, next) {
  const token = readCustomerToken(req)
  if (!token) return next()
  try {
    const payload = jwt.verify(token, SECRET)
    if (payload.role === 'customer') req.customer = payload
  } catch {
    /* ignore */
  }
  next()
}

export function requireAdmin(req, res, next) {
  const token = readToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, SECRET)
    if (payload.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' })
    req.admin = payload
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export async function findAdmin(id) {
  return prisma.admin.findUnique({ where: { id } })
}

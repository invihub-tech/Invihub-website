import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const uploadDir = path.join(root, 'public', 'uploads')

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX = 5 * 1024 * 1024

export async function saveProductImage(file) {
  if (!file) throw Object.assign(new Error('No file'), { status: 400 })
  if (!ALLOWED.has(file.mimetype)) throw Object.assign(new Error('Only JPG, PNG, WEBP'), { status: 400 })
  if (file.size > MAX) throw Object.assign(new Error('File too large'), { status: 400 })
  await fs.mkdir(uploadDir, { recursive: true })
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  await fs.writeFile(path.join(uploadDir, name), file.buffer)
  return `/uploads/${name}`
}

export async function deleteProductImageFile(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return
  const name = path.basename(url)
  if (!name || name.includes('..')) return
  await fs.unlink(path.join(uploadDir, name)).catch(() => {})
}

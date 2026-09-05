import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** invihub-web/ — not process.cwd(), which is often the parent repo folder. */
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const result = dotenv.config({ path: path.join(projectRoot, '.env'), override: true })
if (result.error) {
  console.warn(`Could not load .env from ${projectRoot}: ${result.error.message}`)
}

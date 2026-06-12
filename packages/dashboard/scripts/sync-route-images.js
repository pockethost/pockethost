import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const routesRoot = path.join(packageRoot, 'src/routes')
const staticRoot = path.join(packageRoot, 'static', 'generated')
const extensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

function walkImages(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      walkImages(full, out)
      continue
    }
    if (extensions.has(path.extname(entry).toLowerCase())) out.push(full)
  }
  return out
}

if (existsSync(staticRoot)) rmSync(staticRoot, { recursive: true, force: true })

const files = walkImages(routesRoot)
let copied = 0

for (const file of files) {
  if (file.includes('+page.')) continue

  const rel = file.slice(routesRoot.length + 1)
  const parts = rel.split(path.sep).filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
  const filename = parts[parts.length - 1]
  const dirParts = parts.slice(0, -1)

  const nestedDest = path.join(staticRoot, ...parts)
  mkdirSync(path.dirname(nestedDest), { recursive: true })
  copyFileSync(file, nestedDest)
  copied++

  // SvelteKit +page.md resolves bare filenames against the parent route segment
  // (e.g. /blog/kingdom + 014.jpg → /blog/014.jpg). Mirror that layout here.
  if (dirParts.length > 0) {
    const flatParts = [...dirParts.slice(0, -1), filename]
    const flatDest = path.join(staticRoot, ...flatParts)
    if (flatDest !== nestedDest) {
      mkdirSync(path.dirname(flatDest), { recursive: true })
      copyFileSync(file, flatDest)
      copied++
    }
  }
}

console.log(`Synced ${files.length} route images (${copied} files → static/generated/)`)

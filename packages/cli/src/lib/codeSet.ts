/**
 * Mirror of the server's deploy code set (packages/pockethost/src/services/DeployService/codeSet.ts). Files outside it
 * are skipped with a warning instead of failing the whole deploy.
 */
const ROOT_CODE_FILES = ['package.json', 'bun.lock', 'bun.lockb']

export const isCodePath = (p: string) => {
  if (!p || p.startsWith('/') || p.includes('\\') || p.includes('\0'))
    return false
  const segs = p.split('/')
  if (segs.some((s) => s === '' || s === '.' || s === '..')) return false
  if (segs.some((s) => s.startsWith('.git'))) return false
  const [first] = segs
  if (!first) return false
  // Root node_modules at any depth; node_modules anywhere else is never deployed.
  if (first === 'node_modules') return segs.length > 1
  if (segs.includes('node_modules')) return false
  if (segs.length === 1) {
    return (
      ROOT_CODE_FILES.includes(first) ||
      (first.startsWith('pb_') && first !== 'pb_data')
    )
  }
  if (first === 'pb_data') return false
  return first.startsWith('pb_') || first === 'patches'
}

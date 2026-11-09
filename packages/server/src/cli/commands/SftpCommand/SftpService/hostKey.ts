import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import ssh2 from 'ssh2'

const { utils } = ssh2

export function ensureHostKey(path: string): Buffer {
  if (existsSync(path)) {
    return readFileSync(path)
  }
  mkdirSync(dirname(path), { recursive: true })
  const keys = utils.generateKeyPairSync('ed25519')
  const privateKey = Buffer.isBuffer(keys.private) ? keys.private : Buffer.from(keys.private)
  writeFileSync(path, privateKey)
  return privateKey
}

import { createPrivateKey, randomBytes } from 'crypto'
import { readFileSync } from 'fs'

const writeSshString = (value: Buffer | string) => {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(value)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(buf.length)
  return Buffer.concat([len, buf])
}

export const isPkcs8PrivateKey = (pem: string) =>
  /-----BEGIN PRIVATE KEY-----/.test(pem)

/** ssh2 only accepts OpenSSH / legacy PEM formats, not PKCS#8 Ed25519. */
export const pkcs8Ed25519ToOpenSshPrivateKeyPem = (
  pem: string,
  comment = 'phio'
) => {
  const key = createPrivateKey(pem)
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('Deploy key must be Ed25519')
  }

  const jwk = key.export({ format: 'jwk' }) as { d: string; x: string }
  const seed = Buffer.from(jwk.d, 'base64url')
  const pub = Buffer.from(jwk.x, 'base64url')
  const pubWire = Buffer.concat([
    writeSshString('ssh-ed25519'),
    writeSshString(pub),
  ])

  const check = randomBytes(4)
  const privPlain = Buffer.concat([
    check,
    check,
    writeSshString('ssh-ed25519'),
    writeSshString(pub),
    writeSshString(Buffer.concat([seed, pub])),
    writeSshString(comment),
  ])

  const blockSize = 8
  const padLen = blockSize - (privPlain.length % blockSize)
  const padding = Buffer.alloc(padLen)
  for (let i = 0; i < padLen; i++) {
    padding[i] = i + 1
  }

  const blob = Buffer.concat([
    Buffer.from('openssh-key-v1\0'),
    writeSshString('none'),
    writeSshString('none'),
    writeSshString(''),
    (() => {
      const count = Buffer.alloc(4)
      count.writeUInt32BE(1)
      return count
    })(),
    writeSshString(pubWire),
    writeSshString(Buffer.concat([privPlain, padding])),
  ])

  const b64 = blob.toString('base64').replace(/.{70}/g, '$&\n')
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${b64}\n-----END OPENSSH PRIVATE KEY-----\n`
}

export const readPrivateKeyForSsh2 = (privateKeyPath: string) => {
  const pem = readFileSync(privateKeyPath, 'utf8')
  if (isPkcs8PrivateKey(pem)) {
    return pkcs8Ed25519ToOpenSshPrivateKeyPem(pem)
  }
  return pem
}

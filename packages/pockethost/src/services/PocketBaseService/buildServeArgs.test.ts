import { describe, expect, it } from 'vitest'
import { buildServeArgs } from './buildServeArgs'

const BASE = ['./pocketbase', 'serve', '--http', '0.0.0.0:8090']

describe('buildServeArgs', () => {
  it('returns the base command by default', () => {
    expect(buildServeArgs({})).toEqual(BASE)
  })

  it('adds --dev', () => {
    expect(buildServeArgs({ dev: true })).toEqual([...BASE, '--dev'])
  })

  it('adds --encryptionEnv when PB_ENCRYPTION_KEY is set', () => {
    expect(buildServeArgs({ env: { PB_ENCRYPTION_KEY: 'k'.repeat(32) } })).toEqual([
      ...BASE,
      '--encryptionEnv=PB_ENCRYPTION_KEY',
    ])
  })

  it('never puts the key itself on the command line', () => {
    const key = 'super-secret-key-0123456789abcdef'
    expect(buildServeArgs({ env: { PB_ENCRYPTION_KEY: key } }).join(' ')).not.toContain(key)
  })

  it('does not validate the key (PocketBase decides)', () => {
    expect(buildServeArgs({ env: { PB_ENCRYPTION_KEY: 'short' } })).toContain('--encryptionEnv=PB_ENCRYPTION_KEY')
  })

  it('ignores an empty key', () => {
    expect(buildServeArgs({ env: { PB_ENCRYPTION_KEY: '' } })).toEqual(BASE)
  })

  it('ignores other secrets', () => {
    expect(buildServeArgs({ env: { FOO: 'bar', PH_CORS_ORIGINS: 'https://a.test' } })).toEqual(BASE)
  })

  it('combines flags in a stable order', () => {
    expect(buildServeArgs({ dev: true, env: { PB_ENCRYPTION_KEY: 'k'.repeat(32) } })).toEqual([
      ...BASE,
      '--dev',
      '--encryptionEnv=PB_ENCRYPTION_KEY',
    ])
  })
})

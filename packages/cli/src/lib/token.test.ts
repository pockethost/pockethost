import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config } from './config'
import { INSTANCE_URL } from './constants'
import {
  findInstance,
  isPat,
  maskToken,
  resolveDeployCredential,
} from './token'
import { isCodePath } from './codeSet'

const pat = `ph_pat_abcdefghij12345_${'A'.repeat(39)}wxyz`

const home = mkdtempSync(join(tmpdir(), 'ph-cli-token-'))
process.env.POCKETHOST_HOME = home

afterEach(() => {
  delete process.env.POCKETHOST_MOTHERSHIP_URL
  delete process.env.POCKETHOST_TOKEN
  delete process.env.POCKETHOST_USERNAME
  config('token', '')
  config('pb_auth', '')
  vi.unstubAllGlobals()
})
process.on('exit', () => rmSync(home, { recursive: true, force: true }))

describe('resolveDeployCredential (token only)', () => {
  it('prefers POCKETHOST_TOKEN, then the saved token', async () => {
    config('token', 'saved-pat')
    expect(await resolveDeployCredential()).toEqual({
      token: 'saved-pat',
      source: 'saved token',
    })
    process.env.POCKETHOST_TOKEN = 'env-pat'
    expect(await resolveDeployCredential()).toEqual({
      token: 'env-pat',
      source: 'POCKETHOST_TOKEN',
    })
  })

  it('refuses password setups and explains the 4.0 change', async () => {
    await expect(resolveDeployCredential()).rejects.toThrow(
      /Run 'pockethost login'/
    )
    config('pb_auth', 'old-cookie')
    await expect(resolveDeployCredential()).rejects.toThrow(
      /Email\/password login was removed in CLI 4.0/
    )
    process.env.POCKETHOST_USERNAME = 'me@example.com'
    await expect(resolveDeployCredential()).rejects.toThrow(
      /POCKETHOST_USERNAME\/POCKETHOST_PASSWORD are no longer used/
    )
  })
})

describe('findInstance', () => {
  it('looks up by id, subdomain or custom domain with the token', async () => {
    process.env.POCKETHOST_TOKEN = 'env-pat'
    const fetchMock = vi.fn(async () =>
      Response.json({
        instances: [
          {
            id: 'abc123',
            subdomain: 'myapp',
            cname: 'app.example.com',
            status: 'running',
            power: true,
            version: '0.40',
          },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    expect((await findInstance('myapp')).id).toBe('abc123')
    expect((await findInstance('abc123')).subdomain).toBe('myapp')
    expect((await findInstance('App.Example.com')).subdomain).toBe('myapp')
    await expect(findInstance('nope')).rejects.toThrow(
      /not found, or your token can't access it/
    )
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(`${url}`).toBe(
      'https://pockethost-central.pockethost.io/api/pat/instances'
    )
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer env-pat'
    )
  })

  it('turns a 401 into a create-a-new-token message', async () => {
    process.env.POCKETHOST_TOKEN = 'env-pat'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ message: 'Invalid or expired token.' }, { status: 401 })
      )
    )
    await expect(findInstance('myapp')).rejects.toThrow(
      /Token rejected: Invalid or expired token\. Create a new one/
    )
  })
})

describe('token helpers', () => {
  it('recognises and masks PATs', () => {
    expect(isPat(pat)).toBe(true)
    expect(isPat(` ${pat}\n`)).toBe(true)
    expect(isPat('ph_pat_nope')).toBe(false)
    expect(maskToken(pat)).toBe('ph_pat_…wxyz')
  })
})

describe('INSTANCE_URL', () => {
  it('derives the instance host from the mothership URL', () => {
    expect(INSTANCE_URL('myapp')).toBe('https://myapp.pockethost.io')
    expect(INSTANCE_URL('app.example.com')).toBe('https://app.example.com')
    process.env.POCKETHOST_MOTHERSHIP_URL =
      'http://pockethost-central.pockethost.lvh.me:8080'
    expect(INSTANCE_URL('myapp')).toBe('http://myapp.pockethost.lvh.me:8080')
  })
})

describe('isCodePath', () => {
  it('matches the server code set', () => {
    expect(isCodePath('pb_hooks/main.pb.js')).toBe(true)
    expect(isCodePath('package.json')).toBe(true)
    expect(isCodePath('patches/a.patch')).toBe(true)
    expect(isCodePath('pb_data/data.db')).toBe(false)
    expect(isCodePath('src/index.ts')).toBe(false)
    expect(isCodePath('pb_hooks/node_modules/x.js')).toBe(false)
  })
})

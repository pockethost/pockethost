import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyInstanceUpdate,
  isCronExpression,
  isFullyOff,
  isWebhookEndpoint,
  MothershipError,
  mothershipRequest,
  needsPowerOff,
  parseSecretAssignment,
} from './instanceApi'
import type { InstanceSummary } from './token'

const cred = { token: 'ph_pat_x', source: 'saved token' as const }

const inst = (over: Partial<InstanceSummary> = {}): InstanceSummary => ({
  id: 'abc123',
  subdomain: 'myapp',
  cname: '',
  status: 'idle',
  power: false,
  version: '0.28.*',
  ...over,
})

type Call = { method: string; url: string; body: any }
let calls: Call[]
let state: InstanceSummary

/** Fake mothership: PUT updates `state`; GET /api/pat/instances returns it. Power-off settles to idle immediately. */
const installFetch = () => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL | string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ method, url: `${url}`, body })
      const json = (status: number, data: unknown) =>
        new Response(JSON.stringify(data), { status })
      if (`${url}`.includes('/api/pat/instances')) {
        return json(200, { instances: [state] })
      }
      if (method === 'PUT') {
        const f = body.fields
        if (
          [
            'subdomain',
            'version',
            'cname',
            'dev',
            'syncAdmin',
            'autoVacuum',
          ].some((k) => f[k] !== undefined) &&
          !isFullyOff(state)
        ) {
          return json(400, {
            status: 400,
            message: 'Instance must be powered off first.',
          })
        }
        state = {
          ...state,
          ...f,
          ...(f.power === false ? { status: 'idle' } : {}),
        }
        return json(200, { status: 'ok' })
      }
      return json(404, { message: 'nope' })
    })
  )
}

beforeEach(() => installFetch())
afterEach(() => vi.unstubAllGlobals())

describe('needsPowerOff / isFullyOff', () => {
  it('knows which settings need the instance off', () => {
    expect(needsPowerOff({ power: true })).toBe(false)
    expect(needsPowerOff({ secretsPatch: { A: '1' } })).toBe(false)
    expect(needsPowerOff({ webhooks: [] })).toBe(false)
    expect(needsPowerOff({ version: '0.28.*' })).toBe(true)
    expect(needsPowerOff({ cname: '' })).toBe(true)
  })

  it('treats only powered-off and idle as fully off', () => {
    expect(isFullyOff(inst())).toBe(true)
    expect(isFullyOff(inst({ status: '' }))).toBe(true)
    expect(isFullyOff(inst({ power: true }))).toBe(false)
    expect(isFullyOff(inst({ status: 'running' }))).toBe(false)
  })
})

describe('applyInstanceUpdate', () => {
  it('applies settings that need no power change directly', async () => {
    state = inst({ power: true, status: 'running' })
    await applyInstanceUpdate({
      cred,
      instance: state,
      fields: { secretsPatch: { A: '1' } },
      log: () => {},
    })
    expect(
      calls.filter((c) => c.method === 'PUT').map((c) => c.body.fields)
    ).toEqual([{ secretsPatch: { A: '1' } }])
  })

  it('refuses a power-off setting on a running instance without --cycle', async () => {
    state = inst({ power: true, status: 'running' })
    await expect(
      applyInstanceUpdate({
        cred,
        instance: state,
        fields: { version: '0.29.*' },
        log: () => {},
      })
    ).rejects.toThrow(/must be powered off first.*--cycle/)
    expect(calls.filter((c) => c.method === 'PUT')).toEqual([])
  })

  it('with --cycle powers off, applies, and powers back on', async () => {
    state = inst({ power: true, status: 'running' })
    await applyInstanceUpdate({
      cred,
      instance: state,
      fields: { version: '0.29.*' },
      cycle: true,
      log: () => {},
    })
    expect(
      calls.filter((c) => c.method === 'PUT').map((c) => c.body.fields)
    ).toEqual([{ power: false }, { version: '0.29.*' }, { power: true }])
    expect(state).toMatchObject({ power: true, version: '0.29.*' })
  })

  it('with --cycle leaves an instance that was off, off', async () => {
    state = inst()
    await applyInstanceUpdate({
      cred,
      instance: state,
      fields: { dev: false },
      cycle: true,
      log: () => {},
    })
    expect(
      calls.filter((c) => c.method === 'PUT').map((c) => c.body.fields)
    ).toEqual([{ dev: false }])
  })
})

describe('mothershipRequest', () => {
  it('sends the token and surfaces the server message', async () => {
    state = inst()
    await expect(
      mothershipRequest('DELETE', '/api/nope', { token: 't', body: {} })
    ).rejects.toBeInstanceOf(MothershipError)
    await expect(
      mothershipRequest('DELETE', '/api/nope', { token: 't', body: {} })
    ).rejects.toThrow('nope')
  })
})

describe('input checks', () => {
  it('parses KEY=value and bare KEY', () => {
    expect(parseSecretAssignment('A=1=2')).toEqual(['A', '1=2'])
    expect(parseSecretAssignment('A=')).toEqual(['A', ''])
    expect(parseSecretAssignment('A')).toEqual(['A', null])
  })

  it('accepts paths, not URLs, as webhook endpoints', () => {
    expect(isWebhookEndpoint('/api/cron')).toBe(true)
    expect(isWebhookEndpoint('api/cron')).toBe(false)
    expect(isWebhookEndpoint('https://x.com/a')).toBe(false)
  })

  it('accepts five-field cron schedules', () => {
    expect(isCronExpression('*/5 * * * *')).toBe(true)
    expect(isCronExpression('0 3 * * MON-FRI')).toBe(true)
    expect(isCronExpression('* * * *')).toBe(false)
    expect(isCronExpression('rm -rf / * * *')).toBe(false)
  })
})

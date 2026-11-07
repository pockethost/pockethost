import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEPLOY_KEY_FILE,
  envVar,
  migrateLegacyHome,
  migrateLegacyKeyNames,
} from './constants'
import { savedInstanceName, saveInstanceName } from './defaultInstanceId'

let dir: string
const cwd = process.cwd()

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pockethost-cli-'))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  process.chdir(cwd)
  rmSync(dir, { recursive: true, force: true })
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('envVar', () => {
  it('prefers POCKETHOST_* over PHIO_*', () => {
    vi.stubEnv('POCKETHOST_TEST_A', 'new')
    vi.stubEnv('PHIO_TEST_A', 'old')
    expect(envVar('TEST_A')).toBe('new')
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('falls back to PHIO_* with a single warning', () => {
    vi.stubEnv('PHIO_TEST_B', 'old')
    expect(envVar('TEST_B')).toBe('old')
    expect(envVar('TEST_B')).toBe('old')
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('treats empty values as unset', () => {
    vi.stubEnv('POCKETHOST_TEST_C', '')
    expect(envVar('TEST_C')).toBeUndefined()
  })
})

describe('config folder migration', () => {
  const setupLegacy = () => {
    const legacy = join(dir, 'phio')
    mkdirSync(legacy)
    writeFileSync(join(legacy, 'config.json'), '{"email":"a@b.c"}')
    writeFileSync(join(legacy, 'phio_deploy_ed25519'), 'PRIVATE')
    writeFileSync(join(legacy, 'phio_deploy_ed25519.pub'), 'PUBLIC')
    return legacy
  }

  it('copies login and renames deploy key files', () => {
    const legacy = setupLegacy()
    const home = join(dir, 'pockethost')
    expect(migrateLegacyHome(home, legacy)).toBe(true)
    expect(readFileSync(join(home, 'config.json'), 'utf8')).toContain('a@b.c')
    expect(readFileSync(join(home, DEPLOY_KEY_FILE), 'utf8')).toBe('PRIVATE')
    expect(readFileSync(join(home, `${DEPLOY_KEY_FILE}.pub`), 'utf8')).toBe(
      'PUBLIC'
    )
    expect(statSync(join(home, DEPLOY_KEY_FILE)).mode & 0o777).toBe(0o600)
    // copy, not move
    expect(existsSync(join(legacy, 'phio_deploy_ed25519'))).toBe(true)
  })

  it('leaves an existing new folder alone', () => {
    const legacy = setupLegacy()
    const home = join(dir, 'pockethost')
    mkdirSync(home)
    writeFileSync(join(home, 'config.json'), '{"email":"new@b.c"}')
    expect(migrateLegacyHome(home, legacy)).toBe(false)
    expect(readFileSync(join(home, 'config.json'), 'utf8')).toContain('new@b.c')
    expect(existsSync(join(home, DEPLOY_KEY_FILE))).toBe(false)
  })

  it('does nothing without a legacy folder', () => {
    expect(migrateLegacyHome(join(dir, 'pockethost'), join(dir, 'nope'))).toBe(
      false
    )
  })

  it('renames legacy key files in place (custom home)', () => {
    const legacy = setupLegacy()
    migrateLegacyKeyNames(legacy)
    expect(readFileSync(join(legacy, DEPLOY_KEY_FILE), 'utf8')).toBe('PRIVATE')
    expect(existsSync(join(legacy, 'phio_deploy_ed25519'))).toBe(false)
  })
})

describe('project file migration', () => {
  const linked = () =>
    JSON.parse(readFileSync(join(dir, '.pockethostconfig'), 'utf8'))

  it('reads .pockethostconfig', () => {
    process.chdir(dir)
    writeFileSync('.pockethostconfig', '{"instanceName":"cur"}')
    expect(savedInstanceName()).toBe('cur')
  })

  it('migrates .phioconfig', () => {
    process.chdir(dir)
    writeFileSync('.phioconfig', '{"instanceName":"old"}')
    expect(savedInstanceName()).toBe('old')
    expect(linked()).toEqual({ instanceName: 'old' })
    expect(existsSync('.phioconfig')).toBe(false)
  })

  it('migrates package.json pockethost.instanceName', () => {
    process.chdir(dir)
    writeFileSync(
      'package.json',
      '{"name":"x","pockethost":{"instanceName":"pkg"}}'
    )
    expect(savedInstanceName()).toBe('pkg')
    expect(linked()).toEqual({ instanceName: 'pkg' })
    expect(JSON.parse(readFileSync('package.json', 'utf8'))).toEqual({
      name: 'x',
    })
  })

  it('migrates pockethost.json', () => {
    process.chdir(dir)
    writeFileSync('pockethost.json', '{"instanceName":"pj"}')
    expect(savedInstanceName()).toBe('pj')
    expect(existsSync('pockethost.json')).toBe(false)
  })

  it('POCKETHOST_INSTANCE_NAME wins over files', () => {
    process.chdir(dir)
    writeFileSync('.pockethostconfig', '{"instanceName":"file"}')
    vi.stubEnv('POCKETHOST_INSTANCE_NAME', 'env')
    expect(savedInstanceName()).toBe('env')
  })

  it('link replaces a leftover .phioconfig', () => {
    process.chdir(dir)
    writeFileSync('.phioconfig', '{"instanceName":"old"}')
    saveInstanceName('new')
    expect(linked()).toEqual({ instanceName: 'new' })
    expect(existsSync('.phioconfig')).toBe(false)
  })
})

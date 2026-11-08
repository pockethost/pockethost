import envPaths from 'env-paths'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
} from 'fs'
import { join } from 'path'

export const CLI_NAME = 'pockethost'

/** Project file that links a directory to an instance. */
export const PROJECT_CONFIG_FILE = '.pockethostconfig'
/** Older project files, newest first. Migrated to PROJECT_CONFIG_FILE on first read. */
export const LEGACY_PROJECT_CONFIG_FILE = '.phioconfig'

/** Deploy key files inside the config folder. */
export const DEPLOY_KEY_FILE = 'pockethost_deploy_ed25519'
const LEGACY_DEPLOY_KEY_FILE = 'phio_deploy_ed25519'

const warnedLegacyEnv = new Set<string>()

/**
 * Reads `POCKETHOST_<name>`, falling back to the pre-3.0 `PHIO_<name>` with a
 * one-time warning. Empty strings count as unset.
 */
export const envVar = (name: string): string | undefined => {
  const value = process.env[`POCKETHOST_${name}`]
  if (value) return value
  const legacy = process.env[`PHIO_${name}`]
  if (legacy) {
    if (!warnedLegacyEnv.has(name)) {
      warnedLegacyEnv.add(name)
      console.warn(
        `Warning: PHIO_${name} is deprecated; rename it to POCKETHOST_${name}.`
      )
    }
    return legacy
  }
  return undefined
}

/** `~/.config/pockethost` on Linux (no `-nodejs` suffix). */
const DEFAULT_HOME = () => envPaths(CLI_NAME, { suffix: '' }).config
/** phio < 3.0 used env-paths' default suffix: `~/.config/phio-nodejs` on Linux. */
const LEGACY_DEFAULT_HOME = () => envPaths('phio').config

/**
 * Copies login + deploy key from the pre-3.0 config folder (`phio`) into the
 * new one, renaming key files. Copy, not move, so a failure loses nothing.
 * Only runs when the new folder has no login and no deploy key yet.
 */
export const migrateLegacyHome = (home: string, legacyHome: string) => {
  const hasNew =
    existsSync(join(home, 'config.json')) ||
    existsSync(join(home, DEPLOY_KEY_FILE))
  if (hasNew || home === legacyHome || !existsSync(legacyHome)) return false

  const files = readdirSync(legacyHome)
  if (files.length === 0) return false

  mkdirSync(home, { recursive: true })
  for (const file of files) {
    const target = file.startsWith(LEGACY_DEPLOY_KEY_FILE)
      ? DEPLOY_KEY_FILE + file.slice(LEGACY_DEPLOY_KEY_FILE.length)
      : file
    copyFileSync(join(legacyHome, file), join(home, target))
    if (target === DEPLOY_KEY_FILE) chmodSync(join(home, target), 0o600)
  }
  console.log(`Migrated login and deploy key from ${legacyHome} to ${home}`)
  return true
}

/**
 * Renames `phio_deploy_ed25519*` to `pockethost_deploy_ed25519*` in place.
 * Covers a custom POCKETHOST_HOME / PHIO_HOME that pointed at an old folder.
 */
export const migrateLegacyKeyNames = (home: string) => {
  if (existsSync(join(home, DEPLOY_KEY_FILE))) return
  for (const suffix of ['', '.pub']) {
    const from = join(home, LEGACY_DEPLOY_KEY_FILE + suffix)
    if (existsSync(from)) renameSync(from, join(home, DEPLOY_KEY_FILE + suffix))
  }
}

let homeReady = false
export const CLI_HOME = (...paths: string[]) => {
  const home = envVar('HOME') ?? DEFAULT_HOME()
  if (!homeReady) {
    homeReady = true
    if (!envVar('HOME')) migrateLegacyHome(home, LEGACY_DEFAULT_HOME())
    mkdirSync(home, { recursive: true })
    migrateLegacyKeyNames(home)
  }
  return join(home, ...paths)
}

export const MOTHERSHIP_URL = (...paths: string[]) => {
  const url = new URL(
    envVar('MOTHERSHIP_URL') ?? `https://pockethost-central.pockethost.io`
  )
  url.pathname = join(url.pathname, ...paths)
  return url.toString()
}

/**
 * Base URL of an instance (`https://<name>.pockethost.io`). The deploy API lives on the instance's own host so the
 * ingress delivers it to whichever node owns the instance. A name with a dot is treated as a custom domain.
 */
export const INSTANCE_URL = (name: string) => {
  const m = new URL(MOTHERSHIP_URL())
  const apex = m.hostname.split('.').slice(1).join('.')
  const host = name.includes('.') ? name : `${name}.${apex}`
  return `${m.protocol}//${host}${m.port ? `:${m.port}` : ''}`
}

/** Personal access token (`ph_pat_…`) from the environment, e.g. a CI secret. */
export const TOKEN = () => envVar('TOKEN') ?? ''
export const INSTANCE_NAME = () => envVar('INSTANCE_NAME') ?? ''

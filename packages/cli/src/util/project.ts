import { findUpSync } from 'find-up'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { cwd } from 'process'
import { SessionState } from '../providers/CustomAuthStore'

export type TConfigProjectConfig = {
  dev: {
    session: SessionState
    host: string
  }
  publish: {
    session: SessionState
    host: string
  }
  src: string
  dist: string
}

export const CACHE_FNAME = '.pbcache'

export const mkProjectSaver = <TConfig>(slug: string) => {
  type ConfigMutator = (config: Partial<TConfig>) => Partial<TConfig>
  return (m: ConfigMutator) => {
    const root = getProjectRoot()
    const cachePath = join(root, CACHE_FNAME)
    if (!existsSync(cachePath)) {
      mkdirSync(cachePath, { recursive: true })
    }
    const currentConfig = readSettings<TConfig>(slug)
    const nextConfig = m(currentConfig)
    const fname = join(cachePath, slug)
    const json = JSON.stringify(nextConfig, null, 2)
    console.log(`Saving to ${fname}`, json)
    writeFileSync(`${fname}.json`, json)
  }
}

export const getProjectRoot = () => {
  const root = findUpSync(`package.json`)
  if (!root) return cwd()
  return dirname(root)
}

export const readSettings = <TConfig>(name: string): Partial<TConfig> => {
  const root = getProjectRoot()
  const fname = join(root, CACHE_FNAME, `${name}.json`)
  if (!existsSync(fname)) return {}
  const json = readFileSync(fname).toString()
  const settings = JSON.parse(json)
  return settings as Partial<TConfig>
}

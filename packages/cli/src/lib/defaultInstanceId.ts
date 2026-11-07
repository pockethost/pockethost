import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import {
  INSTANCE_NAME,
  LEGACY_PROJECT_CONFIG_FILE,
  PROJECT_CONFIG_FILE,
} from './constants'

type ProjectConfig = {
  instanceName?: string
}

const readJson = (path: string) => JSON.parse(readFileSync(path).toString())

const readProjectConfig = (): ProjectConfig | null => {
  if (!existsSync(PROJECT_CONFIG_FILE)) {
    return null
  }
  return readJson(PROJECT_CONFIG_FILE) as ProjectConfig
}

const writeProjectConfig = (instanceName: string) => {
  writeFileSync(
    PROJECT_CONFIG_FILE,
    JSON.stringify({ instanceName }, null, 2) + '\n'
  )
}

const migrated = (from: string, instanceName: string) => {
  console.log(
    `Migrated instance link from ${from} to ${PROJECT_CONFIG_FILE} (commit this change)`
  )
  return instanceName
}

/** `.phioconfig` (phio 0.4 – 1.x) */
const migrateLegacyPhioConfig = (): string | null => {
  if (!existsSync(LEGACY_PROJECT_CONFIG_FILE)) {
    return null
  }
  const instanceName = (readJson(LEGACY_PROJECT_CONFIG_FILE) as ProjectConfig)
    .instanceName
  if (!instanceName) {
    return null
  }
  writeProjectConfig(instanceName)
  unlinkSync(LEGACY_PROJECT_CONFIG_FILE)
  return migrated(LEGACY_PROJECT_CONFIG_FILE, instanceName)
}

/** `package.json` → `pockethost.instanceName` (phio < 0.4) */
const migrateLegacyPackageJson = (): string | null => {
  if (!existsSync('package.json')) {
    return null
  }
  const pkg = readJson('package.json')
  const instanceName = pkg.pockethost?.instanceName
  if (!instanceName) {
    return null
  }

  writeProjectConfig(instanceName)
  delete pkg.pockethost.instanceName
  if (Object.keys(pkg.pockethost).length === 0) {
    delete pkg.pockethost
  }
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
  return migrated('package.json', instanceName)
}

/** `pockethost.json` (phio < 0.4) */
const migrateLegacyPockethostJson = (): string | null => {
  if (!existsSync('pockethost.json')) {
    return null
  }
  const instanceName = readJson('pockethost.json').instanceName
  if (!instanceName) {
    return null
  }

  writeProjectConfig(instanceName)
  unlinkSync('pockethost.json')
  return migrated('pockethost.json', instanceName)
}

export const savedInstanceName = () => {
  if (INSTANCE_NAME()) {
    return INSTANCE_NAME()
  }

  const projectConfig = readProjectConfig()
  if (projectConfig?.instanceName) {
    return projectConfig.instanceName
  }

  return (
    migrateLegacyPhioConfig() ??
    migrateLegacyPackageJson() ??
    migrateLegacyPockethostJson()
  )
}

export const saveInstanceName = (instanceName: string) => {
  writeProjectConfig(instanceName)
  // Linking again replaces any old-style file rather than leaving both behind.
  if (existsSync(LEGACY_PROJECT_CONFIG_FILE)) {
    unlinkSync(LEGACY_PROJECT_CONFIG_FILE)
  }
}

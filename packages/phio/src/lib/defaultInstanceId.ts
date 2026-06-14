import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { PHIO_CONFIG_FILE, PHIO_INSTANCE_NAME } from './constants'

type PhioConfig = {
  instanceName?: string
}

const readPhioConfig = (): PhioConfig | null => {
  if (!existsSync(PHIO_CONFIG_FILE)) {
    return null
  }
  return JSON.parse(readFileSync(PHIO_CONFIG_FILE).toString()) as PhioConfig
}

const writePhioConfig = (instanceName: string) => {
  writeFileSync(PHIO_CONFIG_FILE, JSON.stringify({ instanceName }, null, 2) + '\n')
}

const migrateLegacyPackageJson = (): string | null => {
  if (!existsSync('package.json')) {
    return null
  }
  const pkg = JSON.parse(readFileSync('package.json').toString())
  const instanceName = pkg.pockethost?.instanceName
  if (!instanceName) {
    return null
  }

  writePhioConfig(instanceName)
  delete pkg.pockethost.instanceName
  if (Object.keys(pkg.pockethost).length === 0) {
    delete pkg.pockethost
  }
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
  console.log(`Migrated instance link from package.json to ${PHIO_CONFIG_FILE}`)
  return instanceName
}

const migrateLegacyPockethostJson = (): string | null => {
  if (!existsSync('pockethost.json')) {
    return null
  }
  const legacy = JSON.parse(readFileSync('pockethost.json').toString())
  const instanceName = legacy.instanceName
  if (!instanceName) {
    return null
  }

  writePhioConfig(instanceName)
  unlinkSync('pockethost.json')
  console.log(`Migrated instance link from pockethost.json to ${PHIO_CONFIG_FILE}`)
  return instanceName
}

export const savedInstanceName = () => {
  if (PHIO_INSTANCE_NAME()) {
    return PHIO_INSTANCE_NAME()
  }

  const phioConfig = readPhioConfig()
  if (phioConfig?.instanceName) {
    return phioConfig.instanceName
  }

  return migrateLegacyPackageJson() ?? migrateLegacyPockethostJson()
}

export const saveInstanceName = (instanceName: string) => {
  writePhioConfig(instanceName)
}

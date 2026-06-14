import { existsSync, readFileSync, writeFileSync } from 'fs'
import { PHIO_INSTANCE_NAME } from './constants'

export const savedInstanceName = () => {
  if (PHIO_INSTANCE_NAME()) {
    return PHIO_INSTANCE_NAME()
  }
  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json').toString())
    if (pkg.pockethost?.instanceName) {
      return pkg.pockethost.instanceName
    }
  }
  if (existsSync('pockethost.json')) {
    const pkg = JSON.parse(readFileSync('pockethost.json').toString())
    if (pkg.instanceName) {
      return pkg.instanceName
    }
  }
  return null
}

export const saveInstanceName = (
  instanceName: string,
  file: 'package.json' | 'pockethost.json'
) => {
  if (!existsSync(file)) {
    // Create new file if it doesn't exist
    const newContent =
      file === 'package.json'
        ? { pockethost: { instanceName } }
        : { instanceName }
    writeFileSync(file, JSON.stringify(newContent, null, 2))
    return
  }

  // Update existing file
  const content = JSON.parse(readFileSync(file).toString())

  if (file === 'package.json') {
    content.pockethost = content.pockethost || {}
    content.pockethost.instanceName = instanceName
  } else {
    content.instanceName = instanceName
  }

  writeFileSync(file, JSON.stringify(content, null, 2))
}

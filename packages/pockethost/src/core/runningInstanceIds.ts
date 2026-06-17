import { execSync } from 'child_process'
import { DOCKER_INSTANCE_IMAGE_NAME } from '../constants'
import { isCustomerInstanceContainerName } from './dockerInstance'

export const getRunningInstanceIds = (): Set<string> => {
  const ids = new Set<string>()
  const imagePrefix = DOCKER_INSTANCE_IMAGE_NAME()

  try {
    const lines = execSync(`docker ps --format '{{.Names}}\t{{.Image}}'`, {
      encoding: `utf8`,
      stdio: [`pipe`, `pipe`, `ignore`],
    })
      .trim()
      .split(`\n`)
      .filter(Boolean)

    for (const line of lines) {
      const tab = line.indexOf(`\t`)
      if (tab < 0) continue
      const name = line.slice(0, tab)
      const image = line.slice(tab + 1)
      if (!image.startsWith(imagePrefix)) continue
      if (!isCustomerInstanceContainerName(name)) continue
      ids.add(name)
    }
  } catch {
    // docker unavailable or no running containers
  }

  return ids
}

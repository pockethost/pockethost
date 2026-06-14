import { execSync } from 'child_process'
import { resolve } from 'path'
import { INSTANCES_ROOT } from '../constants'

export const getRunningInstanceIds = (): Set<string> => {
  const instancesRoot = resolve(INSTANCES_ROOT())
  const ids = new Set<string>()

  try {
    const containerIds = execSync(`docker ps -q`, { encoding: `utf8`, stdio: [`pipe`, `pipe`, `ignore`] })
      .trim()
      .split(`\n`)
      .filter(Boolean)

    for (const containerId of containerIds) {
      const mountsJson = execSync(`docker inspect -f '{{json .Mounts}}' ${containerId}`, {
        encoding: `utf8`,
        stdio: [`pipe`, `pipe`, `ignore`],
      })
      const mounts = JSON.parse(mountsJson) as Array<{ Source?: string }>
      for (const mount of mounts) {
        const source = mount.Source
        if (!source?.startsWith(instancesRoot)) continue
        const rel = source.slice(instancesRoot.length).replace(/^\//, ``)
        const instanceId = rel.split(`/`)[0]
        if (instanceId) ids.add(instanceId)
      }
    }
  } catch {
    // docker unavailable or no running containers
  }

  return ids
}

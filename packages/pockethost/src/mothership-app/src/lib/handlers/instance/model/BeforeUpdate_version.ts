import { mkLog } from '$util/Logger'
import { versions } from '$util/versions'

export const BeforeUpdate_version = (e: core.RecordEvent) => {
  const log = mkLog(`BeforeUpdate_version`)

  const version = e.record?.get('version')
  if (!versions.includes(version)) {
    const msg = `Invalid version ${version}. Version must be one of: ${versions.join(', ')}`
    log(`[ERROR] ${msg}`)
    throw new BadRequestError(msg)
  }

  e.next()
}

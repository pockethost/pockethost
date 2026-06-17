import { mkLog } from '$util/Logger'
import { listVersions } from '$util/versions'

export const BeforeUpdate_version = (e: core.RecordUpdateEvent) => {
  const log = mkLog(`BeforeUpdate_version`)

  const record = e.record
  if (!record) return

  const version = record.get('version')
  if (version === record.original().get('version')) return

  const versions = listVersions()
  if (!versions.length) return

  if (!versions.includes(version)) {
    const msg = `Invalid version ${version}. Version must be one of: ${versions.join(', ')}`
    log(`[ERROR] ${msg}`)
    throw new BadRequestError(msg)
  }
}

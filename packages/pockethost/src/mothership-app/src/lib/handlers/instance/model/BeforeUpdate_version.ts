import { mkLog } from '$util/Logger'
import { listSelectableVersions, selectableVersionError } from '$util/versions'

/** A version change must land on a selectable (0.23+) version. Instances that keep their version are not checked. */
export const BeforeUpdate_version = (e: core.RecordEvent) => {
  const log = mkLog(`BeforeUpdate_version`)

  const record = e.record
  if (!record) return

  const version = record.get('version')
  if (version === record.original().get('version')) return

  const msg = selectableVersionError(version, listSelectableVersions())
  if (msg) {
    log(`[ERROR] ${msg}`)
    throw new BadRequestError(msg)
  }
}

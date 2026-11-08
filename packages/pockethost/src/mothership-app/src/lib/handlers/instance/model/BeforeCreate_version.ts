import { mkLog } from '$util/Logger'
import { listSelectableVersions, selectableVersionError } from '$util/versions'

/** New instances must use a selectable (0.23+) version, whichever path creates them. */
export const BeforeCreate_version = (e: core.RecordEvent) => {
  const log = mkLog(`BeforeCreate_version`)

  const record = e.record
  if (!record) return

  const msg = selectableVersionError(record.get('version'), listSelectableVersions())
  if (msg) {
    log(`[ERROR] ${msg}`)
    throw new BadRequestError(msg)
  }
}

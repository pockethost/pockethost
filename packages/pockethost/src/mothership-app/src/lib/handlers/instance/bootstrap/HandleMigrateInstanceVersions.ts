import { mkLog } from '$util/Logger'
import { versions } from '$util/versions'

export const HandleMigrateInstanceVersions = (e: core.BootstrapEvent) => {
  const dao = $app.dao()

  const log = mkLog(`bootstrap`)

  const records = dao.findRecordsByFilter(`instances`, '1=1').filter((r) => !!r)
  const unrecognized: string[] = []
  records.forEach((record) => {
    const v = record.get('version').trim()
    if (versions.includes(v)) return
    const newVersion = (() => {
      if (v.startsWith(`~`)) {
        const [major, minor] = v.slice(1).split('.')
        const newVersion = [major, minor, '*'].join('.')
        return newVersion
      } else {
        if (v === `^0` || v === `0` || v === '1') {
          return versions[0]
        }
      }
    })()
    if (versions.includes(newVersion)) {
      record.set(`version`, newVersion)
      dao.saveRecord(record)
    } else {
      unrecognized.push(v)
    }
  })
  log({ unrecognized })
}

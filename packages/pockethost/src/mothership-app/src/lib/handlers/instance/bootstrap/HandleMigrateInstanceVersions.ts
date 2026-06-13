import { mkLog } from '$util/Logger'
import { listVersions } from '$util/versions'

export const HandleMigrateInstanceVersions = (_e: core.BootstrapEvent) => {
  const log = mkLog(`bootstrap`)

  const versions = listVersions()
  const records = $app.findRecordsByFilter(`instances`, '1=1').filter((r) => !!r)
  const unrecognized: string[] = []
  records.forEach((record) => {
    const v = record.getString('version').trim()
    if (versions.includes(v)) return
    const newVersion = (() => {
      if (v.startsWith(`~`)) {
        const [major, minor] = v.slice(1).split('.')
        const newVersion = [major, minor, '*'].join('.')
        return newVersion
      } else {
        if (v === `^0` || v === `0` || v === '1') {
          return versions[0]!
        }
      }
      return v
    })()
    if (versions.includes(newVersion)) {
      record.set(`version`, newVersion)
      $app.save(record)
    } else {
      unrecognized.push(v)
    }
  })
  log({ unrecognized })
}

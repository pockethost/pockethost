/** Migrate version numbers */
onAfterBootstrap((e) => {
  const dao = $app.dao()
  const { audit, mkLog, versions } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )

  const log = mkLog(`bootstrap`)

  const records = dao.findRecordsByFilter(`instances`, '1=1')
  const unrecognized = []
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
})

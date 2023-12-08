/// <reference path="../types/types.d.ts" />

/**
 * Migrate version numbers
 */
onAfterBootstrap((e) => {
  const records = $app.dao().findRecordsByFilter(`instances`, '1=1')
  const { versions } = require(`${__hooks}/versions.js`)
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
      $app.dao().saveRecord(record)
    } else {
      unrecognized.push(v)
    }
  })
  unrecognized.forEach((v) => console.log(`***unrecognized ${v}`))
})

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('settings')

    try {
      dao.findFirstRecordByData('settings', 'name', 'rate_limit_tiers')
      return
    } catch (e) {
      // not found — seed below
    }

    const record = new Record(collection)
    record.set('name', 'rate_limit_tiers')
    record.set('value', {
      default: {
        ipBurst: 120,
        hostnameBurst: 1200,
        ipHourly: 1000,
        hostnameHourly: 10000,
        ipConcurrent: 15,
        hostnameConcurrent: 250,
        ipBoostMultiplier: 5,
      },
      free: {},
      premium: { hostnameHourly: 15000, hostnameBurst: 1800 },
      founder: { hostnameHourly: 20000, hostnameBurst: 2400 },
      flounder: {},
      legacy: {},
    })

    return dao.saveRecord(record)
  },
  (db) => {
    const dao = new Dao(db)

    try {
      const record = dao.findFirstRecordByData('settings', 'name', 'rate_limit_tiers')
      dao.deleteRecord(record)
    } catch (e) {
      // already removed
    }
  }
)

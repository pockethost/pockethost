import { mkLog } from '$util/Logger'

export const HandleMigrateCnamesToDomains = (e: core.BootstrapEvent) => {
  const dao = $app.dao()
  const log = mkLog(`bootstrap:migrate-cnames`)

  log(`Starting cname to domains migration`)

  try {
    // Check if domains table exists
    const domainsCollection = dao.findCollectionByNameOrId('domains')
    if (!domainsCollection) {
      log(`Domains collection not found, skipping migration`)
      return
    }

    // Check if there are any instances with cnames that haven't been migrated
    log(`Checking for instances with cnames`)
    const instancesWithCnames = dao.findRecordsByFilter(
      'instances',
      "cname != NULL && cname != ''",
    )

    if (instancesWithCnames.length === 0) {
      log(`No cnames to migrate`)
      return
    }

    log(`Found ${instancesWithCnames.length} instances with cnames`)

    // Check which ones are already migrated
    const unmigrated = instancesWithCnames.filter((instance) => {
      if (!instance) return false
      try {
        const existingDomain = dao.findFirstRecordByFilter(
          'domains',
          `instance = "${instance.getId()}"`,
        )
        return !existingDomain
      } catch (e) {
        // Not found means not migrated
        return true
      }
    })

    if (unmigrated.length === 0) {
      log(`All cnames already migrated`)
      return
    }

    log(`Found ${unmigrated.length} cnames to migrate`)

    // Migrate cnames to domains table
    let migrated = 0
    unmigrated.forEach((instance) => {
      if (!instance) return
      try {
        const domainsCollection = dao.findCollectionByNameOrId('domains')
        const domainRecord = new Record(domainsCollection)

        domainRecord.set('instance', instance.getId())
        domainRecord.set('domain', instance.getString('cname'))
        domainRecord.set('active', instance.getBool('cname_active'))

        dao.saveRecord(domainRecord)
        migrated++
      } catch (error) {
        log(`Failed to migrate cname for instance ${instance.getId()}:`, error)
      }
    })

    log(`Successfully migrated ${migrated} cnames to domains table`)
  } catch (error) {
    log(`Error migrating cnames: ${error}`)
  }
}

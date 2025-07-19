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
    const instancesWithCnames = dao.findRecordsByFilter('instances', "cname != NULL && cname != ''")

    if (instancesWithCnames.length === 0) {
      log(`No cnames to migrate`)
      return
    }

    log(`Found ${instancesWithCnames.length} instances with cnames`)

    // Phase 1: Migrate cnames to domains collection
    log(`Phase 1: Migrating cnames to domains collection`)
    let cnameMigrated = 0
    instancesWithCnames.forEach((instance) => {
      if (!instance) return

      try {
        const cname = instance.getString('cname')
        if (!cname) return

        const instanceId = instance.getId()

        // Check if domain record already exists
        let domainExists = false
        try {
          dao.findFirstRecordByFilter('domains', `instance = "${instanceId}" && domain = "${cname}"`)
          domainExists = true
        } catch (e) {
          // Domain record doesn't exist
        }

        if (!domainExists) {
          const domainsCollection = dao.findCollectionByNameOrId('domains')
          const domainRecord = new Record(domainsCollection)

          domainRecord.set('instance', instanceId)
          domainRecord.set('domain', cname)
          domainRecord.set('active', instance.getBool('cname_active'))

          dao.saveRecord(domainRecord)
          log(`Created domain record for ${cname}`)
          cnameMigrated++
        }
      } catch (error) {
        log(`Failed to migrate cname for instance ${instance.getId()}:`, error)
      }
    })

    log(`Phase 1 complete: migrated ${cnameMigrated} cnames to domains collection`)

    // Phase 2: Sync all domain records with instances.domains arrays
    log(`Phase 2: Syncing domains collection with instances.domains arrays`)
    const allDomainRecords = dao.findRecordsByFilter('domains', '1=1')
    log(`Found ${allDomainRecords.length} domain records`)
    let instancesUpdated = 0

    // Group domains by instance for efficiency
    const domainsByInstance = new Map()
    allDomainRecords.forEach((domainRecord) => {
      if (!domainRecord) return

      const instanceId = domainRecord.getString('instance')
      if (!domainsByInstance.has(instanceId)) {
        domainsByInstance.set(instanceId, [])
      }
      domainsByInstance.get(instanceId).push(domainRecord.getId())
    })

    // Update each instance's domains array
    log(`Updating instances.domains arrays`)
    domainsByInstance.forEach((domainIds, instanceId) => {
      try {
        const instance = dao.findRecordById('instances', instanceId)
        if (!instance) return

        const currentDomains = instance.get('domains') || []
        log(`Current domains:`, currentDomains)
        const missingIds = domainIds.filter((id: string) => !currentDomains.includes(id))

        if (missingIds.length > 0) {
          const updatedDomains = [...currentDomains, ...missingIds]
          instance.set('domains', updatedDomains)
          dao.saveRecord(instance)
          log(`Updated instance ${instanceId}: added ${missingIds.length} domain IDs to domains array`)
          instancesUpdated++
        }
      } catch (error) {
        log(`Failed to update domains array for instance ${instanceId}:`, error)
      }
    })

    log(`Phase 2 complete: updated domains arrays for ${instancesUpdated} instances`)
  } catch (error) {
    log(`Error migrating cnames: ${error}`)
  }
}

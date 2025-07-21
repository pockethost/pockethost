import {
  InstanceFields,
  LoggerService,
  mkInstanceDataPath,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  PocketBase,
} from '@'
import { Command } from 'commander'
import { existsSync } from 'fs'
import fse from 'fs-extra'

const { moveSync } = fse

export const MigrateCommand = () => {
  return new Command(`migrate`)
    .description(`Migrate instance(s)`)
    .option(`-i, --instance <instanceId>`, `The instance to migrate`)
    .option(`-m, --mount-point <mountPoint>`, `The mount point`, `cloud-storage`)
    .action(async (options) => {
      const logger = LoggerService().create(`cli:edge:volume:migrate`)
      const { dbg } = logger
      dbg({ options })

      const { instance: instanceId, mountPoint } = options

      const pb = new PocketBase(MOTHERSHIP_URL())

      await pb.admins.authWithPassword(MOTHERSHIP_ADMIN_USERNAME(), MOTHERSHIP_ADMIN_PASSWORD())

      const filter = [`status='idle'`, `volume=''`]
      if (instanceId) {
        filter.push(`id = '${instanceId}'`)
      }
      console.log(`Filter is`, filter.join(` && `))

      do {
        try {
          await migrate(mountPoint, pb, filter.join(` && `))
        } catch (e) {
          console.error(`No record found ${e}`)
        }
      } while (!instanceId)
    })
}

async function migrate(mountPoint: string, pb: PocketBase, filter: string) {
  const instance = await pb.collection<InstanceFields>('instances').getFirstListItem(filter)

  const oldSuspension = instance.suspension
  try {
    console.log(`Suspending instance ${instance.id}`)
    await pb.collection<InstanceFields>('instances').update(instance.id, {
      suspension: 'migrating',
    })

    const instanceDataSrc = mkInstanceDataPath('', instance.id)
    const instanceDataDst = mkInstanceDataPath(mountPoint, instance.id)

    if (existsSync(instanceDataSrc) && !existsSync(instanceDataDst)) {
      console.log(`Moving ${instanceDataSrc} to ${instanceDataDst}`)
      moveSync(instanceDataSrc, instanceDataDst)
    } else {
      console.warn(
        `Skipping ${instanceDataSrc} to ${instanceDataDst} because source does not exist or destination already exists`
      )
    }

    console.log(`Updating instance ${instance.id} with volume ${mountPoint}`)
    await pb.collection<InstanceFields>('instances').update(instance.id, {
      volume: mountPoint,
    })

    console.log(`Migrated ${instanceDataSrc} to ${instanceDataDst}`)
  } catch (e) {
    console.error(`${e}`, JSON.stringify(e, null, 2))
  } finally {
    console.log(`Restoring previous suspension value of instance ${instance.id}`)
    await pb.collection<InstanceFields>('instances').update(instance.id, {
      suspension: oldSuspension === 'migrating' ? '' : oldSuspension,
    })
  }
}

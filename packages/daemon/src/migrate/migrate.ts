import { DEBUG, PH_BIN_CACHE, PUBLIC_APP_DB } from '$constants'
import { pocketbase } from '$services'
import { InstanceStatus, logger, safeCatch } from '@pockethost/common'
import { schema } from './schema'
import { withInstance } from './withInstance'
;(async () => {
  const { info } = logger({ debug: DEBUG }).create('migrate')

  const pbService = await pocketbase({
    cachePath: PH_BIN_CACHE,
    checkIntervalMs: 5 * 60 * 1000,
  })

  safeCatch(`root`, async () => {
    // await backupInstance(
    //   PUBLIC_PB_SUBDOMAIN,
    //   `${+new Date()}`,
    //   async (progress) => {
    //     dbg(progress)
    //   }
    // )

    info(`Upgrading`)
    const upgradeProcess = await pbService.spawn({
      command: 'upgrade',
      slug: PUBLIC_APP_DB,
    })
    await upgradeProcess.exited

    await withInstance(async (client) => {
      await client.applySchema(schema)

      await client.updateInstances((instance) => {
        const version = (() => {
          if (instance.platform === 'ermine') return '~0.7.0'
          if (instance.platform === 'lollipop') return '~0.10.0'
          return pbService.getLatestVersion()
        })()
        console.log(`Updating instance ${instance.id} to ${version}`)
        return {
          status: InstanceStatus.Idle,
          version,
        }
      })
    })
    console.log(`All instances updated`)
  })()
  pbService.shutdown()
})()

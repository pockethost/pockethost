import { pocketbase } from '$services'
import { InstanceStatus, logger, safeCatch } from '@pockethost/common'
import { PH_BIN_CACHE, PUBLIC_PB_SUBDOMAIN } from '../constants'
import { schema } from './schema'
import { withInstance } from './withInstance'
;(async () => {
  const { info } = logger().create('migrate')

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
      slug: PUBLIC_PB_SUBDOMAIN,
    })
    await upgradeProcess.exited

    await withInstance(async (client) => {
      await client.applySchema(schema)

      await client.updateInstances((instance) => {
        const version = (() => {
          if (instance.platform === 'ermine') return '^0.7.0'
          if (instance.platform === 'lollipop') return '^0.10.0'
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

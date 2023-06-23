import { clientService } from '$services'
import { InstanceId, serialAsyncExecutionGuard } from '@pockethost/common'
import { random, range, shuffle, values } from '@s-libs/micro-dash'
import { Command } from 'commander'
import fetch from 'node-fetch'
import { ContextBase, GlobalOptions } from '../types'

export type StressOptions = GlobalOptions & {
  instanceCount: number
  requestsPerInstance: number
  minDelay: number
  maxDelay: number
}
export const createStress = (context: { program: Command } & ContextBase) => {
  const { program } = context
  const logger = context.logger.create(`createStress`)
  const { dbg, error } = logger

  const seedCmd = program.command('stress')
  seedCmd
    .description('Seed system with new instances')
    .description('Stress the system')
    .option(
      '-ic, --instance-count <number>',
      `Number of simultaneous instances to hit`,
      parseInt,
      100
    )
    .option(
      '-rc, --requests-per-instance <number>',
      `Number of simultaneous requests per instance`,
      parseInt,
      50
    )
    .option(
      '-mind, --min-delay <number>',
      `Minimum number of milliseconds to delay before sending another request`,
      parseInt,
      50
    )
    .option(
      '-maxd, --max-delay <number>',
      `Maximum number of milliseconds to delay before sending another request`,
      parseInt,
      500
    )
    .action(async () => {
      const options = seedCmd.optsWithGlobals<StressOptions>()

      const { client } = await clientService({
        url: options.mothershipUrl,
        logger,
      })

      const users = await client.client.collection('users').getFullList()
      dbg(users)

      const { instanceCount, requestsPerInstance, minDelay, maxDelay } = options

      const excluded: { [_: string]: boolean } = {}
      const resetInstance = serialAsyncExecutionGuard(
        async (instanceId: InstanceId) => {
          if (excluded[instanceId]) return
          await client.updateInstance(instanceId, { maintenance: false })
        },
        (id) => `reset:${id}`
      )

      const instances = await client.getInstances()
      dbg(`Instances ${instances.length}`)

      /**
       * Stress test
       */
      const stress = async () => {
        try {
          const instance = shuffle(instances)
            .filter((v) => !excluded[v.id])
            .pop()
          dbg(
            `There are ${instances.length} instances and ${
              values(excluded).length
            } excluded`
          )
          if (!instance) throw new Error(`No instance to grab`)

          {
            const { subdomain, id } = instance
            await resetInstance(id)
            const thisLogger = logger.create(subdomain)
            thisLogger.breadcrumb(id)

            await Promise.all(
              range(requestsPerInstance).map(async (i) => {
                const requestLogger = thisLogger.create(`${i}`)
                const { dbg } = requestLogger
                const url = `https://${subdomain}.pockethost.test/_`
                dbg(`Fetching ${url}`)
                const res = await fetch(url)
                if (res.status !== 200) {
                  const body = res.body?.read().toString()
                  dbg(`${url} response error ${res.status} ${body}`)
                  if (body?.match(/maintenance/i)) {
                    dbg(`Maintenance mode detected. Excluding`)
                    excluded[id] = true
                  }
                  if (res.status === 403 && !!body?.match(/Timeout/)) {
                    return // Timeout
                  }
                }
              })
            )
          }
        } catch (e) {
          error(`failed with: ${e}`, e)
        } finally {
          setTimeout(stress, random(minDelay, maxDelay))
        }
      }
      range(Math.min(instances.length, instanceCount)).forEach(() => {
        stress()
      })
    })
}

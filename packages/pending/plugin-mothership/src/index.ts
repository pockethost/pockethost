import Bottleneck from 'bottleneck'
import {
  APEX_DOMAIN,
  ClientResponseError,
  Command,
  EDGE_APEX_DOMAIN,
  InstanceFields,
  InstanceId,
  InstanceStatus,
  LoggerService,
  PocketBase,
  PocketHostAction,
  PocketHostFilter,
  PocketHostPlugin,
  SpawnConfig,
  filter,
  stringify,
  tryFetch,
} from 'pockethost/core'
import { MothershipAdminClientService } from './MothershipAdminClientService'
import { MothershipCommand } from './MothershipCommand'
import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_INTERNAL_URL,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  MOTHERSHIP_URL,
} from './env'
import { mkInstanceCache } from './mkInstanceCache'

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  const logger = LoggerService().create(`MothershipPlugin`)
  const { dbg, error } = logger

  registerFilter(
    PocketHostFilter.Core_CliCommands,
    async (commands: Command[]) => {
      return [...commands, MothershipCommand()]
    },
  )

  registerAction(PocketHostAction.Core_Init, async () => {
    await MothershipAdminClientService({
      url: MOTHERSHIP_INTERNAL_URL(),
      username: MOTHERSHIP_ADMIN_USERNAME(),
      password: MOTHERSHIP_ADMIN_PASSWORD(),
    })
  })

  registerAction(PocketHostAction.Core_Cli_Before_ServeCommand, async () => {
    await tryFetch(`${MOTHERSHIP_INTERNAL_URL(`/api/health`)}`, {})
  })

  registerAction(
    PocketHostAction.Core_BeforeInstanceStarted,
    async ({ instance }) =>
      updateInstanceStatus(instance.id, InstanceStatus.Starting),
  )

  registerAction(
    PocketHostAction.Core_BeforeInstanceStopped,
    async ({ instance }) =>
      updateInstanceStatus(instance.id, InstanceStatus.Idle),
  )

  registerFilter(
    PocketHostFilter.Core_SpawnConfig,
    async (spawnArgs: SpawnConfig, { instance }) => {
      /** Sync admin account */
      if (!instance.syncAdmin) return spawnArgs
      const id = instance.uid
      dbg(`Fetching token info for uid ${id}`)
      const { email, tokenKey, passwordHash } = await client.getUserTokenInfo({
        id,
      })
      dbg(`Token info is`, { email, tokenKey, passwordHash })
      spawnArgs.env!.ADMIN_SYNC = stringify({
        id,
        email,
        tokenKey,
        passwordHash,
      })
      return spawnArgs
    },
  )

  registerAction(PocketHostAction.Core_Log, async ({ instance }) => {
    updateInstanceStatus(instance.id, InstanceStatus.Running)
  })

  registerFilter(
    PocketHostFilter.Core_GetInstance,
    async (instance: InstanceFields | undefined, { host }) => {
      if (cache.hasItem(host)) {
        dbg(`cache hit ${host}`)
        return cache.getItem(host)
      }
      dbg(`cache miss ${host}`)

      {
        dbg(`Trying to get instance by host: ${host}`)
        const instance = await client
          .getInstanceByCname(host)

          .catch((e: ClientResponseError) => {
            if (e.status !== 404) {
              throw new Error(
                `Unexpected response ${stringify(e)} from mothership`,
              )
            }
          })
        if (instance) {
          if (!instance.cname_active) {
            throw new Error(`CNAME blocked.`)
          }
          dbg(`${host} is a cname`)
          cache.setItem(instance)
          return instance
        }
      }

      const idOrSubdomain = host.replace(`.${EDGE_APEX_DOMAIN()}`, '')
      {
        dbg(`Trying to get instance by ID: ${idOrSubdomain}`)
        const instance = await client
          .getInstanceById(idOrSubdomain)
          .catch((e: ClientResponseError) => {
            if (e.status !== 404) {
              throw new Error(
                `Unexpected response ${stringify(e)} from mothership`,
              )
            }
          })
        if (instance) {
          dbg(`${idOrSubdomain} is an instance ID`)
          cache.setItem(instance)
          return instance
        }
      }
      {
        dbg(`Trying to get instance by subdomain: ${idOrSubdomain}`)
        const instance = await client
          .getInstanceBySubdomain(idOrSubdomain)
          .catch((e: ClientResponseError) => {
            if (e.status !== 404) {
              throw new Error(
                `Unexpected response ${stringify(e)} from mothership`,
              )
            }
          })
        if (instance) {
          dbg(`${idOrSubdomain} is a subdomain`)
          cache.setItem(instance)
          return instance
        }
      }
      dbg(`${host} is none of: cname, id, subdomain`)
      cache.blankItem(host)
    },
  )

  registerFilter(
    PocketHostFilter.Core_AuthenticateRequest,
    async (isAuthenticated, { req, auth, instanceId }) => {
      /** Validate auth token */
      const client = new PocketBase(MOTHERSHIP_URL())
      client.authStore.loadFromCookie(auth)
      dbg(`Cookie here is`, client.authStore.isValid)
      await client.collection('users').authRefresh()
      if (!client.authStore.isValid) {
        throw new Error(`Cookie is invalid her`)
      }
      const user = client.authStore.model
      if (!user) {
        throw new Error(`Valid user expected here`)
      }
      dbg(`Cookie auth passed)`)

      /** Validate instance and ownership */
      dbg(`Got a log request for instance ID ${instanceId}`)
      const instance = await client
        .collection('instances')
        .getOne<InstanceFields>(instanceId)
      if (!instance) {
        throw new Error(
          `instanceId ${instanceId} not found for user ${user.id}`,
        )
      }
      dbg(`Instance is `, instance)
    },
  )

  registerAction(
    PocketHostAction.Core_AfterInstanceFound,
    async ({ instance }) => {
      const owner = instance.expand.uid
      if (!owner) {
        throw new Error(`Instance owner is invalid`)
      }

      /*
    Suspension check
    */
      dbg(`Checking for suspension`)
      if (instance.suspension) {
        throw new Error(instance.suspension)
      }

      /*
    Maintenance check
    */
      dbg(`Checking for maintenance mode`)
      if (instance.maintenance) {
        throw new Error(
          await filter(
            PocketHostFilter.Mothership_MaintenanceMode_Message,
            `This instance is in Maintenance Mode.`,
            { instance },
          ),
        )
      }

      /*
    Owner check
    */
      dbg(`Checking for verified account`)
      if (!owner.verified) {
        throw new Error(
          await filter(
            PocketHostFilter.Mothership_UnverifiedAccountError_Message,
            `Owner account not verified`,
          ),
        )
      }
    },
  )

  registerFilter(PocketHostFilter.Mothership_PublicUrl, async () =>
    MOTHERSHIP_URL(),
  )

  registerFilter(PocketHostFilter.Firewall_HostnameRoutes, async (routes) => {
    return {
      ...routes,
      [`${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${MOTHERSHIP_PORT()}`,
    }
  })

  registerFilter(PocketHostFilter.EdgeSelfCheck_Checks, async (checks) => {
    return [
      ...checks,
      {
        name: `mothership`,
        priority: 9,
        emoji: `:flying_saucer:`,
        url: MOTHERSHIP_URL(),
      },
    ]
  })

  const { client } = await MothershipAdminClientService()
  const cache = mkInstanceCache(client.client)

  /*
  Create serialized client communication functions to prevent race conditions
  */
  const clientLimiter = (() => {
    const limiters: { [key: string]: Bottleneck } = {}
    return (id: InstanceId) => {
      if (!limiters[id]) {
        limiters[id] = new Bottleneck({ maxConcurrent: 1 })
      }
      return limiters[id]!
    }
  })()

  const updateInstance = (id: InstanceId, fields: Partial<InstanceFields>) =>
    clientLimiter(id).schedule(() => {
      dbg(`Updating instance fields`, fields)
      return client
        .updateInstance(id, fields)
        .then(() => {
          dbg(`Updated instance fields`, fields)
        })
        .catch((e) => {
          dbg(`Error updating instance fields`, fields)
          error(e)
        })
    })
  const updateInstanceStatus = (id: InstanceId, status: InstanceStatus) =>
    updateInstance(id, { status })
}

export default plugin

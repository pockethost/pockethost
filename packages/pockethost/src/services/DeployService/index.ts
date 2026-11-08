import { ClientResponseError } from 'pocketbase'
import { DATA_ROOT, LoggerService, mkInstanceDataPath, mkSingleton, MOTHERSHIP_URL, PocketBase } from '../..'
import type { InstanceFields, PatVerifyResult, SingletonBaseConfig } from '../../common'
import { InstanceLogReader } from '../InstanceLoggerService'
import { instanceService } from '../InstanceService'
import { MothershipAdminClientService } from '../MothershipAdminClientService'
import { MothershipMirrorService } from '../MothershipMirrorService'
import { proxyService } from '../ProxyService'
import { createDeployAuthResolver, DeployAuthError } from './auth'
import { createDeployStore, type DeployStore } from './deployStore'
import { createDeployRouter, DEPLOY_API_PREFIX } from './router'

export * from './auth'
export * from './bundle'
export * from './codeSet'
export * from './deployStore'
export * from './router'

export const DEPLOY_DATA_ROOT = (...paths: string[]) => DATA_ROOT('deploys', ...paths)

const authFailure = (e: unknown, fallback: string) => {
  if (e instanceof ClientResponseError && [400, 401, 403, 404].includes(e.status)) {
    const status = e.status === 403 ? 403 : 401
    return new DeployAuthError(status, (e.response as { message?: string })?.message || fallback)
  }
  return e
}

/** Mounts the deploy API on the edge daemon. Must be registered before the instance proxy catch-all. */
export const DeployService = mkSingleton(async (config: SingletonBaseConfig) => {
  const logger = (config.logger ?? LoggerService()).create(`DeployService`)
  const { client } = await MothershipAdminClientService()
  const mirror = await MothershipMirrorService()

  const auth = createDeployAuthResolver({
    verifyPat: async (token, ip) => {
      try {
        return await client.client.send<PatVerifyResult>(`/api/pat/verify`, { method: 'POST', body: { token, ip } })
      } catch (e) {
        throw authFailure(e, `Invalid or expired token.`)
      }
    },
    verifyJwt: async (token) => {
      const pb = new PocketBase(MOTHERSHIP_URL())
      pb.authStore.save(token, null)
      try {
        const r = await pb.collection('users').authRefresh()
        return { userId: r.record.id }
      } catch (e) {
        throw authFailure(e, `Your login has expired. Run 'pockethost login' or use a token.`)
      }
    },
  })

  const stores = new Map<string, DeployStore>()
  const storeFor = (instance: InstanceFields) => {
    let store = stores.get(instance.id)
    if (!store) {
      store = createDeployStore(DEPLOY_DATA_ROOT(instance.id), mkInstanceDataPath(instance.id))
      stores.set(instance.id, store)
    }
    return store
  }

  const router = createDeployRouter({
    resolveAuth: auth.resolve,
    getInstanceByHost: (host) => mirror.getInstanceByHost(host),
    getUser: (id) => mirror.getUser(id),
    storeFor,
    withInstanceStopped: async (instance, fn) => (await instanceService()).withInstanceStopped(instance.id, fn),
    startInstance: async (instance) => (await instanceService()).startInstance(instance.id),
    recordDeploy: async (input) => (await client.client.collection('deploys').create(input)).id,
    tailLogs: (instance, linesBack, onEntry) =>
      InstanceLogReader(instance.id, `exec`, logger).tail(linesBack, (entry) => onEntry(entry)),
    logger,
  })

  ;(await proxyService()).use(DEPLOY_API_PREFIX, router)
  logger.info(`Deploy API mounted at ${DEPLOY_API_PREFIX}`)
  return {}
})

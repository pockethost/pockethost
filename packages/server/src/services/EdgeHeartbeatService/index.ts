import {
  asyncExitHook,
  flushEdgeTrafficStatsWindow,
  getEdgeTrafficStatsSnapshot,
  LoggerService,
  mkSingleton,
  PH_EDGE_HEARTBEAT_MS,
  PH_EDGE_ID,
  PH_EDGE_INTERNAL_URL,
  PH_EDGE_REGION,
  SingletonBaseConfig,
} from '@'
import { MothershipAdminClientService } from '../MothershipAdminClientService'

export type EdgeHeartbeatServiceConfig = SingletonBaseConfig

export const EdgeHeartbeatService = mkSingleton(async (config: EdgeHeartbeatServiceConfig) => {
  const logger = (config.logger ?? LoggerService()).create('EdgeHeartbeat')
  const { dbg, error } = logger

  const { client: adminClient } = await MothershipAdminClientService()
  const edgeId = PH_EDGE_ID()
  const intervalMs = PH_EDGE_HEARTBEAT_MS()

  const push = async (status: 'online' | 'offline' = 'online') => {
    const stats = getEdgeTrafficStatsSnapshot()
    flushEdgeTrafficStatsWindow()

    try {
      await adminClient.client.send(`/api/edge/heartbeat`, {
        method: `POST`,
        body: {
          edge_id: edgeId,
          label: edgeId,
          // Other edges route to this one through the mothership mirror, using these two fields.
          region: PH_EDGE_REGION(),
          internal_url: PH_EDGE_INTERNAL_URL(),
          status,
          stats,
        },
      })
      dbg(`heartbeat ${edgeId}`, { requests: stats.requests, errors: stats.errors })
    } catch (e) {
      error(`heartbeat failed for ${edgeId}: ${e}`)
    }
  }

  const timer = setInterval(() => {
    void push()
  }, intervalMs)

  void push()

  // A clean shutdown tells the other edges right away, so they stop holding requests for this one.
  asyncExitHook(async () => {
    clearInterval(timer)
    await push('offline')
  }, 3000)

  return {
    stop: () => clearInterval(timer),
  }
})

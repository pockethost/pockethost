import {
  flushEdgeTrafficStatsWindow,
  getEdgeTrafficStatsSnapshot,
  LoggerService,
  mkSingleton,
  PH_EDGE_HEARTBEAT_MS,
  PH_EDGE_ID,
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

  const push = async () => {
    const stats = getEdgeTrafficStatsSnapshot()
    flushEdgeTrafficStatsWindow()

    try {
      await adminClient.client.send(`/api/edge/heartbeat`, {
        method: `POST`,
        body: {
          edge_id: edgeId,
          label: edgeId,
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

  return {
    stop: () => clearInterval(timer),
  }
})

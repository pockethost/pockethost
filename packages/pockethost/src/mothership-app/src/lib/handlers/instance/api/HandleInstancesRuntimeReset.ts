import { refreshAndBroadcastLivePlatformStats } from '../../adminPlugins/platformStats'
import { resetInstancesIdle } from '../bootstrap/resetInstancesIdle'

export const HandleInstancesRuntimeReset = (e: core.RequestEvent) => {
  const reset = resetInstancesIdle($app)
  refreshAndBroadcastLivePlatformStats()
  return e.json(200, { ok: true, reset })
}

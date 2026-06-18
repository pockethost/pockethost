import { refreshAndBroadcastLivePlatformStats } from '../../adminPlugins/platformStats'
import { resetInstancesIdle } from '../../instance/bootstrap/resetInstancesIdle'
import { applyLiveInstances } from '../lib/applyLiveInstances'
import { buildMirrorDump } from '../lib/buildMirrorDump'

export const HandleMirrorSync = (e: core.RequestEvent) => {
  const { body } = e.requestInfo()

  if (body.resetIdle) {
    resetInstancesIdle($app)
  }

  const liveInstances = Array.isArray(body.instances) ? body.instances : []
  const updated = applyLiveInstances($app, liveInstances)

  if (body.resetIdle || updated > 0) {
    refreshAndBroadcastLivePlatformStats()
  }

  return e.json(200, { ...buildMirrorDump($app), updated })
}

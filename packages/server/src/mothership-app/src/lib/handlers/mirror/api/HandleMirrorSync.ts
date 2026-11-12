import { authEdge } from '$util/edgeAuth'
import { refreshAndBroadcastLivePlatformStats } from '../../adminPlugins/platformStats'
import { resetInstancesIdle } from '../../instance/bootstrap/resetInstancesIdle'
import { applyLiveInstances } from '../lib/applyLiveInstances'
import { buildMirrorDump } from '../lib/buildMirrorDump'

export const HandleMirrorSync = (e: core.RequestEvent) => {
  const { body } = e.requestInfo()
  const edge = authEdge(e)

  if (body.resetIdle) {
    // Resets every instance on every edge: superuser (the Node edge) only.
    if (edge) throw new ForbiddenError(`resetIdle needs a superuser.`)
    resetInstancesIdle($app)
  }

  const liveInstances = Array.isArray(body.instances) ? body.instances : []
  const updated = applyLiveInstances($app, liveInstances, edge?.id)

  if (body.resetIdle || updated > 0) {
    refreshAndBroadcastLivePlatformStats()
  }

  // `dump: false`: an edge reporting its live instances after a reconnect; it catches up on its own, incrementally.
  if (body.dump === false) {
    return e.json(200, { updated })
  }

  return e.json(200, { ...buildMirrorDump($app), updated })
}

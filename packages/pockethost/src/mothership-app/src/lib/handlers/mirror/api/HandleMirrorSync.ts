import { resetInstancesIdle } from '../../instance/bootstrap/resetInstancesIdle'
import { applyLiveInstances } from '../lib/applyLiveInstances'
import { buildMirrorDump } from '../lib/buildMirrorDump'

export const HandleMirrorSync = (c: echo.Context) => {
  const dao = $app.dao()
  const { data } = $apis.requestInfo(c)

  if (data.resetIdle) {
    resetInstancesIdle(dao)
  }

  const liveInstances = Array.isArray(data.instances) ? data.instances : []
  // Server-side saveRecord loop: one POST from edge, realtime events for dashboard SSE.
  const updated = applyLiveInstances(dao, liveInstances)

  return c.json(200, { ...buildMirrorDump(dao), updated })
}

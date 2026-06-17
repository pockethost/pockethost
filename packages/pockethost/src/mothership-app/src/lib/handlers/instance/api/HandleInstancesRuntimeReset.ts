import { resetInstancesIdle } from '../bootstrap/resetInstancesIdle'

export const HandleInstancesRuntimeReset = (e: core.RequestEvent) => {
  const reset = resetInstancesIdle($app)
  return e.json(200, { ok: true, reset })
}

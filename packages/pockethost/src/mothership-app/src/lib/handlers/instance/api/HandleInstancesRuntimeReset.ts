import { resetInstancesIdle } from '../bootstrap/resetInstancesIdle'

export const HandleInstancesRuntimeReset = (c: echo.Context) => {
  const reset = resetInstancesIdle($app.dao())
  return c.json(200, { ok: true, reset })
}

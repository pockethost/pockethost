import { resetInstancesIdle } from './resetInstancesIdle'

export const HandleInstancesResetIdle = (e: core.BootstrapEvent) => {
  resetInstancesIdle($app.dao())
}

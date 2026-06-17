import { resetInstancesIdle } from './resetInstancesIdle'

export const HandleInstancesResetIdle = (_e: core.BootstrapEvent) => {
  resetInstancesIdle($app)
}

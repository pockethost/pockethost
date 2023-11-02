import { DAEMON_INITIAL_PORT_POOL_SIZE } from '$constants'
import { mkSingleton } from '$shared'
import { mergeConfig, PromiseAllocator } from '$util'
import getPort from 'get-port'

export type Config = { maxPorts: number }
export const PortService = mkSingleton((config: Partial<Config> = {}) => {
  const { maxPorts } = mergeConfig(
    { maxPorts: DAEMON_INITIAL_PORT_POOL_SIZE },
    config,
  )
  return PromiseAllocator(maxPorts, getPort)
})

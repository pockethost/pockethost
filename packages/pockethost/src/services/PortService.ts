import { INITIAL_PORT_POOL_SIZE } from '$constants'
import { PromiseAllocator, mergeConfig, mkSingleton } from '$public'
import getPort from 'get-port'

export type Config = { maxPorts: number }
export const PortService = mkSingleton((config: Partial<Config> = {}) => {
  const { maxPorts } = mergeConfig(
    { maxPorts: INITIAL_PORT_POOL_SIZE() },
    config,
  )
  return PromiseAllocator(maxPorts, getPort)
})

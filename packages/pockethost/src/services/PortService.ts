import getPort from 'get-port'
import {
  INITIAL_PORT_POOL_SIZE,
  PromiseAllocator,
  mergeConfig,
  mkSingleton,
} from '../../core'

export type Config = { maxPorts: number }
export const PortService = mkSingleton((config: Partial<Config> = {}) => {
  const { maxPorts } = mergeConfig(
    { maxPorts: INITIAL_PORT_POOL_SIZE() },
    config,
  )
  return PromiseAllocator(maxPorts, getPort)
})

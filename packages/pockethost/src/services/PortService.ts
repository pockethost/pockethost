import getPort from 'get-port'
import { INITIAL_PORT_POOL_SIZE, mergeConfig, mkSingleton } from '../../core'
import { ResourceAllocator } from '../common/ResourceAllocator'

export type Config = { maxPorts: number }
export const PortService = mkSingleton((config: Partial<Config> = {}) => {
  const { maxPorts } = mergeConfig(
    { maxPorts: INITIAL_PORT_POOL_SIZE() },
    config,
  )
  return ResourceAllocator(maxPorts, getPort)
})

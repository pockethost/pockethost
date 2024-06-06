import { INITIAL_PORT_POOL_SIZE } from '$constants'
import { mergeConfig, mkSingleton } from '$public'
import { PromiseAllocator } from '$util'
import getPort from 'get-port'

export type Config = { maxPorts: number }
export const PortService = mkSingleton((config: Partial<Config> = {}) => {
  const { maxPorts } = mergeConfig(
    { maxPorts: INITIAL_PORT_POOL_SIZE() },
    config,
  )
  return PromiseAllocator(maxPorts, getPort)
})

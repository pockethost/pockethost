import { INITIAL_PORT_POOL_SIZE } from '$constants'
import { mergeConfig, PromiseAllocator } from '$util'
import { mkSingleton } from '@pockethost/common'
import getPort from 'get-port'

export type Config = { maxPorts: number }
export const PortService = mkSingleton((config: Partial<Config> = {}) => {
  const { maxPorts } = mergeConfig(
    { maxPorts: INITIAL_PORT_POOL_SIZE() },
    config,
  )
  return PromiseAllocator(maxPorts, getPort)
})

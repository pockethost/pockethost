import getPort from 'get-port'
import { INITIAL_PORT_POOL_SIZE } from '../../core'
import { Allocator, ResourceAllocator, ioc } from '../common'

export type Config = { maxPorts: number }

export const PortService = () => {
  try {
    return ioc<Allocator<number>>('portAllocator')
  } catch (e) {
    return ioc(
      'portAllocator',
      ResourceAllocator(INITIAL_PORT_POOL_SIZE(), getPort),
    )
  }
}

import { DAEMON_MAX_PORTS } from '$constants'
import { PromiseAllocator } from '$util'
import getPort from 'get-port'

export const port = PromiseAllocator(DAEMON_MAX_PORTS, getPort)

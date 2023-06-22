import { DAEMON_PB_PORT_BASE } from '$constants'
import {
  logger,
  mkSingleton,
  serialAsyncExecutionGuard,
} from '@pockethost/common'
import { range, remove } from '@s-libs/micro-dash'
import getPort from 'get-port'

export type PortResult = [number, () => void]

export type PortManagerConfig = {
  maxPorts: number
}

export const portManager = mkSingleton(async (cfg: PortManagerConfig) => {
  const { maxPorts } = cfg
  const _logger = logger().create(`PortManager`)
  const { dbg, error } = _logger

  const getNextPort = (() => {
    const { dbg, error } = _logger.create(`getNextPort`)
    let exclude: number[] = []

    return serialAsyncExecutionGuard(async (): Promise<PortResult> => {
      dbg(`Getting free port`)
      try {
        const newPort = await getPort({
          port: DAEMON_PB_PORT_BASE,
          exclude,
        })
        exclude.push(newPort)
        dbg(`Currently excluded ports: ${exclude.join(',')}`)
        return [
          newPort,
          () => {
            const removed = remove(exclude, (v) => v === newPort)
            dbg(
              `Removed ${removed.join(',')} from excluded ports: ${exclude.join(
                ','
              )}`
            )
          },
        ]
      } catch (e) {
        throw new Error(`Failed to get free port with ${e}`)
      }
    })
  })()

  const ports = await (
    await Promise.all<PortResult>(range(maxPorts).map(getNextPort))
  ).map((portInfo) => portInfo[0])

  return {
    getNextPort: (): PortResult => {
      const port = ports.pop()
      if (!port) {
        throw new Error(`Out of ports`)
      }
      return [
        port,
        () => {
          ports.push(port)
        },
      ]
    },
    shutdown: () => {},
  }
})

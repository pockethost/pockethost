import { hostname } from 'os'

export type EdgeTrafficStatsSnapshot = {
  requests: number
  errors: number
  hosts: Array<[string, number]>
  ips: Array<[string, number]>
  countries: Array<[string, number]>
}

const emptySnapshot = (): EdgeTrafficStatsSnapshot => ({
  requests: 0,
  errors: 0,
  hosts: [],
  ips: [],
  countries: [],
})

let statsController: {
  snapshot: () => EdgeTrafficStatsSnapshot
  flush: () => void
} | null = null

export const getEdgeTrafficStatsSnapshot = () => statsController?.snapshot() ?? emptySnapshot()

export const flushEdgeTrafficStatsWindow = () => statsController?.flush()

export const registerEdgeTrafficStatsController = (controller: {
  snapshot: () => EdgeTrafficStatsSnapshot
  flush: () => void
}) => {
  statsController = controller
}

export const defaultEdgeId = () => hostname() || 'local'

import type express from 'express'
import { isIPv4, isIPv6 } from 'node:net'

export const WEIGHT_DEN = 10
export const FILES_WEIGHT_NUM = 1
export const API_WEIGHT_NUM = WEIGHT_DEN

export const toProxyCidrString = (entry: string): string => {
  if (entry.includes('/')) return entry
  if (isIPv4(entry)) return `${entry}/32`
  if (isIPv6(entry)) return `${entry}/128`
  return entry
}

export const getConnectingIp = (req: express.Request): string | undefined => {
  const cf = req.headers['cf-connecting-ip'] || req.headers['true-client-ip']
  if (cf) return Array.isArray(cf) ? cf[0] : cf

  const xff = req.headers['x-forwarded-for']
  const xffStr = Array.isArray(xff) ? xff.join(',') : xff
  if (typeof xffStr === 'string') {
    const ip = xffStr.split(',')?.[0]?.trim()
    if (ip) return ip
  }

  const xri = req.headers['x-real-ip']
  if (xri) return Array.isArray(xri) ? xri[0] : xri

  return req.ip || req.socket?.remoteAddress
}

export const isPocketBaseFilesPath = (path: string): boolean => path === '/api/files' || path.startsWith('/api/files/')

export const isHealthProbePath = (path: string): boolean =>
  path === '/api/firewall/health' || path === '/_api/daemon/health' || path.startsWith('/_api/daemon/vacuum')

export const toMicroPointLimit = (cfg: { points: number; duration: number }) => ({
  points: cfg.points * WEIGHT_DEN,
  duration: cfg.duration,
})

export const consumeWeightForPath = (path: string): number =>
  isPocketBaseFilesPath(path) ? FILES_WEIGHT_NUM : API_WEIGHT_NUM

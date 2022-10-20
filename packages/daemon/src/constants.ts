import { existsSync } from 'fs'

export const PUBLIC_APP_DOMAIN =
  process.env.PUBLIC_APP_DOMAIN || `pockethost.test`
export const PUBLIC_PB_SUBDOMAIN =
  process.env.PUBLIC_PB_SUBDOMAIN || `pockethost-central`
export const DAEMON_PB_USERNAME = (() => {
  const v = process.env.DAEMON_PB_USERNAME
  if (!v) {
    throw new Error(`DAEMON_PB_USERNAME environment variable must be specified`)
  }
  return v
})()
export const DAEMON_PB_PASSWORD = (() => {
  const v = process.env.DAEMON_PB_PASSWORD
  if (!v) {
    throw new Error(`DAEMON_PB_PASSWORD environment variable must be specified`)
  }
  return v
})()
export const DAEMON_PB_PORT_BASE = process.env.DAEMON_PB_PORT_BASE
  ? parseInt(process.env.DAEMON_PB_PORT_BASE, 10)
  : 8090
export const DAEMON_PB_IDLE_TTL = process.env.DAEMON_PB_IDLE_TTL
  ? parseInt(process.env.DAEMON_PB_IDLE_TTL, 10)
  : 5000
export const DAEMON_PB_BIN_DIR = (() => {
  const v = process.env.DAEMON_PB_BIN_DIR
  if (!v) {
    throw new Error(
      `DAEMON_PB_BIN_DIR (${v}) environment variable must be specified`
    )
  }
  if (!existsSync(v)) {
    throw new Error(`DAEMON_PB_BIN_DIR (${v}) path must exist`)
  }
  return v
})()
export const DAEMON_PB_DATA_DIR = (() => {
  const v = process.env.DAEMON_PB_DATA_DIR
  if (!v) {
    throw new Error(
      `DAEMON_PB_DATA_DIR (${v}) environment variable must be specified`
    )
  }
  if (!existsSync(v)) {
    throw new Error(`DAEMON_PB_DATA_DIR (${v}) path must exist`)
  }
  return v
})()

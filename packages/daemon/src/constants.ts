export const APP_DOMAIN = process.env.APP_DOMAIN || `pockethost.local`
export const CORE_PB_SUBDOMAIN =
  process.env.CORE_PB_SUBDOMAIN || `pockethost-central`
export const CORE_PB_USERNAME = (() => {
  const v = process.env.CORE_PB_USERNAME
  if (!v) {
    throw new Error(`CORE_PB_USERNAME environment variable must be specified`)
  }
  return v
})()
export const CORE_PB_PASSWORD = (() => {
  const v = process.env.CORE_PB_PASSWORD
  if (!v) {
    throw new Error(`CORE_PB_PASSWORD environment variable must be specified`)
  }
  return v
})()
export const CORE_PB_PORT = process.env.CORE_PB_PORT
  ? parseInt(process.env.CORE_PB_PORT, 10)
  : 8090
export const PB_IDLE_TTL = process.env.PB_IDLE_TTL
  ? parseInt(process.env.PB_IDLE_TTL, 10)
  : 5000

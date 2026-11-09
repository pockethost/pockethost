import { sweepCustomHostnames } from '../cron/sweepCustomHostnames'

/** POST /api/cloudflare/hostnames/sweep[?apply=1] (superuser). Dry run unless apply=1. */
export const HandleCustomHostnamesSweep = (e: core.RequestEvent) => {
  const apply = e.request!.url!.query().get('apply') === '1'
  return e.json(200, sweepCustomHostnames(apply))
}

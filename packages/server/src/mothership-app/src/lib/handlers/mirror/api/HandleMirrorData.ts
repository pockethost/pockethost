import { buildMirrorDump } from '../lib/buildMirrorDump'

export const HandleMirrorData = (e: core.RequestEvent) => {
  return e.json(200, buildMirrorDump($app))
}

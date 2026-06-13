import { buildMirrorDump } from '../lib/buildMirrorDump'

export const HandleMirrorData = (c: echo.Context) => {
  return c.json(200, buildMirrorDump($app.dao()))
}

import { versions } from '$util/versions'

/** Return a list of available PocketBase versions */
export const HandleVersionsRequest = (c: echo.Context) => {
  return c.json(200, { versions })
}

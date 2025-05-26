import { mkLog } from '$util/Logger'

export const HandleInstanceResolve = (c: echo.Context) => {
  const dao = $app.dao()

  const log = mkLog(`GET:instance/resolve`)

  log(`***TOP OF GET`)
  const host = c.queryParam('host')

  if (!host) {
    throw new BadRequestError(`Host is required when resolving an instance.`)
  }

  {
    try {
      const record = $app
        .dao()
        .findFirstRecordByData('instances', 'cname', host)
      if (record) {
        return c.json(200, { instance: record })
      }
    } catch (e) {
      log(`${host} is not a cname`)
    }
  }

  const [subdomain, ...junk] = host.split('.')

  if (!subdomain) {
    throw new BadRequestError(
      `Subdomain is required when resolving an instance.`,
    )
  }

  {
    try {
      const record = $app.dao().findRecordById('instances', subdomain)
      if (record) {
        return c.json(200, { instance: record })
      }
    } catch (e) {
      log(`${subdomain} is not an instance ID`)
    }
  }

  {
    try {
      const record = $app
        .dao()
        .findFirstRecordByData('instances', `subdomain`, subdomain)
      if (record) {
        return c.json(200, { instance: record })
      }
    } catch (e) {
      log(`${subdomain} is not a subdomain`)
    }
  }

  throw new BadRequestError(`Instance not found.`)
}

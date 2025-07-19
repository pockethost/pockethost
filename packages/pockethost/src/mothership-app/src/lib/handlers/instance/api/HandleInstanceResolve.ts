import { mkLog } from '$util/Logger'

export const HandleInstanceResolve = (c: echo.Context) => {
  const dao = $app.dao()

  const log = mkLog(`GET:instance/resolve`)

  log(`TOP OF GET`)
  const host = c.queryParam('host')

  if (!host) {
    throw new BadRequestError(`Host is required when resolving an instance.`)
  }

  const instance = (() => {
    try {
      log(`Checking for cname ${host}`)
      const record = $app.dao().findFirstRecordByData('instances', 'cname', host)
      return record
    } catch (e) {
      log(`${host} is not a cname`)
    }

    const [subdomain, ...junk] = host.split('.')

    if (!subdomain) {
      throw new BadRequestError(`Subdomain or instance ID is required when resolving an instance without a cname.`)
    }

    try {
      log(`Checking for instance ID ${subdomain}`)
      const record = $app.dao().findRecordById('instances', subdomain)
      return record
    } catch (e) {
      log(`${subdomain} is not an instance ID`)
    }

    try {
      log(`Checking for subdomain ${subdomain}`)
      const record = $app.dao().findFirstRecordByData('instances', `subdomain`, subdomain)
      return record
    } catch (e) {
      log(`${subdomain} is not a subdomain`)
    }

    throw new BadRequestError(`Instance not found.`)
  })()

  log(`Checking for instance suspension`)
  if (instance.get('suspension')) {
    throw new BadRequestError(instance.get('suspension'))
  }

  const APP_URL = (...path: string[]) => [$os.getenv('APP_URL'), ...path].join('/')
  const DOC_URL = (...path: string[]) => APP_URL('docs', ...path)

  /*
  power check
  */
  log(`Checking for power`)
  if (!instance.getBool('power')) {
    throw new BadRequestError(`This instance is powered off. See ${DOC_URL(`power`)} for more information.`)
  }

  const user = (() => {
    const userId = instance.get('uid')
    if (!userId) {
      throw new BadRequestError(`Instance has no user.`)
    }

    try {
      log(`Checking for user ${userId}`)
      const record = $app.dao().findRecordById('users', userId)
      return record
    } catch (e) {
      log(`User ${userId} not found`)
    }
    throw new BadRequestError(`User not found.`)
  })()

  log(`Checking for user suspension`)
  if (user.get('suspension')) {
    throw new BadRequestError(user.get('suspension'))
  }

  /*
  Active instance check
  */
  log(`Checking for active instances`)
  if (user.getInt('subscription_quantity') === 0) {
    throw new BadRequestError(`Instances will not run until you <a href=${APP_URL(`access`)}>upgrade</a>.`)
  }

  /*
  Owner check
  */
  log(`Checking for verified account`)
  if (!user.getBool('verified')) {
    throw new BadRequestError(`Log in at ${APP_URL()} to verify your account.`)
  }

  const tokenKey = user.getString('tokenKey')
  const passwordHash = user.getString('passwordHash')
  const email = user.getString('email')

  const userJSON = JSON.parse(JSON.stringify(user))

  const ret = {
    instance,
    user: {
      ...userJSON,
      tokenKey,
      passwordHash,
      email,
    },
  }

  log(`Returning instance and user`, ret)
  return c.json(200, ret)
}

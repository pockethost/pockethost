import { versions } from '$util/versions'
import { error } from '../error'

export const HandleSignupConfirm = (c: echo.Context) => {
  const dao = $app.dao()
  const parsed = (() => {
    const rawBody = readerToString(c.request().body)
    try {
      const parsed = JSON.parse(rawBody)
      return parsed
    } catch (e) {
      throw new BadRequestError(
        `Error parsing payload. You call this JSON? ${rawBody}`,
        e,
      )
    }
  })()
  const email = parsed.email?.trim().toLowerCase()
  const password = parsed.password?.trim()
  const desiredInstanceName = parsed.instanceName?.trim()
  const region = parsed.region?.trim()
  const version = parsed.version?.trim() || versions[0]

  if (!email) {
    throw error(`email`, 'required', 'Email is required')
  }

  if (!password) {
    throw error(`password`, `required`, 'Password is required')
  }

  if (!desiredInstanceName) {
    throw error(`instanceName`, `required`, `Instance name is required`)
  }

  const userExists = (() => {
    try {
      const record = dao.findFirstRecordByData('users', 'email', email)
      return true
    } catch {
      return false
    }
  })()

  if (userExists) {
    throw error(
      `email`,
      `exists`,
      `That user account already exists. Try a password reset.`,
    )
  }

  dao.runInTransaction((txDao) => {
    const usersCollection = dao.findCollectionByNameOrId('users')
    const instanceCollection = $app.dao().findCollectionByNameOrId('instances')

    const user = new Record(usersCollection)
    try {
      const username = $app
        .dao()
        .suggestUniqueAuthRecordUsername(
          'users',
          'user' + $security.randomStringWithAlphabet(5, '123456789'),
        )
      user.set('username', username)
      user.set('email', email)
      user.set('subscription', 'free')
      user.set('subscription_quantity', 0)
      user.setPassword(password)
      txDao.saveRecord(user)
    } catch (e) {
      throw error(`email`, `fail`, `Could not create user: ${e}`)
    }

    try {
      const instance = new Record(instanceCollection)
      instance.set('subdomain', desiredInstanceName)
      instance.set('region', region || `sfo-2`)
      instance.set('uid', user.get('id'))
      instance.set('status', 'idle')
      instance.set('power', true)
      instance.set('syncAdmin', true)
      instance.set('dev', true)
      instance.set('version', version)
      txDao.saveRecord(instance)
    } catch (e) {
      if (`${e}`.match(/ UNIQUE /)) {
        throw error(
          `instanceName`,
          `exists`,
          `Instance name was taken, sorry about that. Try another.`,
        )
      }
      throw error(`instanceName`, `fail`, `Could not create instance: ${e}`)
    }

    $mails.sendRecordVerification($app, user)
  })

  return c.json(200, { status: 'ok' })
}

import { versions } from '$util/versions'
import { error } from '../error'

export const HandleSignupConfirm = (c: core.RequestEvent) => {
  const dao = $app
  const parsed = (() => {
    const rawBody = toString(c.request?.body)
    try {
      const parsed = JSON.parse(rawBody)
      return parsed
    } catch (e) {
      throw new BadRequestError(`Error parsing payload. You call this JSON? ${rawBody}`, e)
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
    throw error(`email`, `exists`, `That user account already exists. Try a password reset.`)
  }

  function suggestUniqueAuthRecordUsername(
		collectionModelOrIdentifier:string,
		baseUsername:string,
	) {
		let username = baseUsername
		for (let i = 0; i < 10; i++) { // max 10 attempts
			try {
				let total = $app.countRecords(
					collectionModelOrIdentifier,
					$dbx.exp("LOWER([[username]])={:username}", { "username": username.toLowerCase() }),
				)
				if (total == 0) {
					break // already unique
				}
			} catch { }

			username = baseUsername + $security.randomStringWithAlphabet(3 + i, "123456789")
		}

		return username
	}

  dao.runInTransaction((txDao) => {
    const usersCollection = dao.findCollectionByNameOrId('users')
    const instanceCollection = dao.findCollectionByNameOrId('instances')

    const user = new Record(usersCollection)
    try {
      const username = suggestUniqueAuthRecordUsername('users', 'user')

      user.set('username', username)
      user.set('email', email)
      user.set('subscription', 'free')
      user.set('subscription_quantity', 0)
      user.setPassword(password)
      txDao.save(user)
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
      txDao.save(instance)
    } catch (e) {
      if (`${e}`.match(/ UNIQUE /)) {
        throw error(`instanceName`, `exists`, `Instance name was taken, sorry about that. Try another.`)
      }
      throw error(`instanceName`, `fail`, `Could not create instance: ${e}`)
    }

    $mails.sendRecordVerification($app, user)
  })

  return c.json(200, { status: 'ok' })
}

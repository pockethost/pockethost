import { listVersions } from '$util/versions'
import { error } from '../error'

const suggestUniqueAuthRecordUsername = (collection: string, baseUsername: string) => {
  let username = baseUsername
  for (let i = 0; i < 10; i++) {
    try {
      const total = $app.countRecords(
        collection,
        $dbx.exp('LOWER([[username]])={:username}', { username: username.toLowerCase() })
      )
      if (total === 0) break
    } catch {}
    username = baseUsername + $security.randomStringWithAlphabet(3 + i, '123456789')
  }
  return username
}

export const HandleSignupConfirm = (e: core.RequestEvent) => {
  const parsed = (() => {
    const rawBody = readerToString(e.request.body)
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
  const version = parsed.version?.trim() || listVersions()[0]

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
      $app.findFirstRecordByData('users', 'email', email)
      return true
    } catch {
      return false
    }
  })()

  if (userExists) {
    throw error(`email`, `exists`, `That user account already exists. Try a password reset.`)
  }

  $app.runInTransaction((txApp) => {
    const usersCollection = $app.findCollectionByNameOrId('users')
    const instanceCollection = $app.findCollectionByNameOrId('instances')

    const user = new Record(usersCollection)
    try {
      const username = suggestUniqueAuthRecordUsername(
        'users',
        'user' + $security.randomStringWithAlphabet(5, '123456789')
      )
      user.set('username', username)
      user.set('email', email)
      user.set('subscription', 'free')
      user.set('subscription_quantity', 0)
      user.set('volume_storage_used', 0)
      user.set('object_storage_used', 0)
      user.setPassword(password)
      txApp.save(user)
    } catch (e) {
      throw error(`email`, `fail`, `Could not create user: ${e}`)
    }

    try {
      const instance = new Record(instanceCollection)
      instance.set('subdomain', desiredInstanceName)
      instance.set('uid', user.get('id'))
      instance.set('status', 'idle')
      instance.set('power', true)
      instance.set('syncAdmin', true)
      instance.set('autoVacuum', true)
      instance.set('dev', true)
      instance.set('version', version)
      txApp.save(instance)
    } catch (e) {
      if (`${e}`.match(/ UNIQUE /)) {
        throw error(`instanceName`, `exists`, `Instance name was taken, sorry about that. Try another.`)
      }
      throw error(`instanceName`, `fail`, `Could not create instance: ${e}`)
    }

    $mails.sendRecordVerification($app, user)
  })

  return e.json(200, { status: 'ok' })
}

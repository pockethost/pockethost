/// <reference path="../types/types.d.ts" />

routerAdd(
  'GET',
  '/api/signup',
  (c) => {
    const isAvailable = (slug) => {
      try {
        const record = $app
          .dao()
          .findFirstRecordByData('instances', 'subdomain', slug)
        return false
      } catch {
        return true
      }
    }

    const error = (fieldName, slug, description, extra) =>
      new ApiError(500, description, {
        [fieldName]: new ValidationError(slug, description),
        ...extra,
      })

    const instanceName = (() => {
      const name = c.queryParam('name').trim()
      if (name) {
        if (isAvailable(name)) {
          return name
        }
        throw error(
          `instanceName`,
          `exists`,
          `Instance name ${name} is not available.`,
        )
      } else {
        const random = require(`${__hooks}/random-words.js`)
        let i = 0
        while (true) {
          i++
          if (i > 100) {
            return +new Date()
          }
          const slug = random.generate(2).join(`-`)
          if (isAvailable(slug)) return slug
        }
      }
    })()
    return c.json(200, { instanceName })
  } /* optional middlewares */,
)

/*
  // HTTP 200
  {
    status: 'ok'
  }
  
  // HTTP 500
  {
      "code": 500,
      "message": "That user account already exists. Try a password reset.",
      "data": {
          "email": {
              "code": "exists",
              "message": "That user account already exists. Try a password reset."
          }
      }
  }
  
  {
      "code": 500,
      "message": "Instance name was taken, sorry aboout that. Try another.",
      "data": {
          "instanceName": {
              "code": "exists",
              "message": "Instance name was taken, sorry aboout that. Try another."
          }
      }
  }
  */

// https://pocketbase.io/docs/js-routing/#sending-request-to-custom-routes-using-the-sdks
routerAdd(
  'POST',
  '/api/signup',
  (c) => {
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
    const email = parsed.email?.trim()
    const password = parsed.password?.trim()
    const desiredInstanceName = parsed.instanceName?.trim()

    const error = (fieldName, slug, description, extra) =>
      new ApiError(500, description, {
        [fieldName]: new ValidationError(slug, description),
        ...extra,
      })

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
        const record = $app.dao().findFirstRecordByData('users', 'email', email)
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

    $app.dao().runInTransaction((txDao) => {
      const usersCollection = $app.dao().findCollectionByNameOrId('users')
      const instanceCollection = $app
        .dao()
        .findCollectionByNameOrId('instances')

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
        user.setPassword(password)
        txDao.saveRecord(user)
      } catch (e) {
        throw error(`email`, `fail`, `Could not create user: ${e}`)
      }

      try {
        const instance = new Record(instanceCollection)
        instance.set('subdomain', desiredInstanceName)
        instance.set('uid', user.get('id'))
        instance.set('status', 'Idle')
        instance.set('version', '~0.19.0')
        txDao.saveRecord(instance)
      } catch (e) {
        if (e.toString().match(/ UNIQUE /)) {
          throw error(
            `instanceName`,
            `exists`,
            `Instance name was taken, sorry aboout that. Try another.`,
          )
        }
        throw error(`instanceName`, `fail`, `Could not create instance: ${e}`)
      }

      $mails.sendRecordVerification($app, user)
    })

    return c.json(200, { status: 'ok' })
  } /* optional middlewares */,
)

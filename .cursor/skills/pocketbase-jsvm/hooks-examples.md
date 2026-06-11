# JSVM Hook Examples

## Bootstrap with shared config

```js
// pb_hooks/main.pb.js
onAfterBootstrap((e) => {
  const config = require(`${__hooks}/config/config.js`)
  console.log('Instance initialized!', config.appName)
})
```

```js
// pb_hooks/config/config.js
module.exports = {
  appName: 'my-app',
  hello: (name) => 'Hello ' + name,
}
```

## Custom route (client calls via pb.send)

```js
routerAdd('POST', '/test/:testId', (c) => {
  return c.json(200, { testId: c.pathParam('testId') })
})
```

## Record hook on create

```js
onRecordAfterCreateRequest((e) => {
  const record = e.record
  const res = $http.send({
    url: 'https://api.stripe.com/v1/customers',
    method: 'POST',
    body: { email: record.get('email') },
    headers: { Authorization: 'Bearer sk_...' },
  })
  console.log('Stripe response', res.statusCode)
}, 'users')
```

## Mothership pattern (this repo)

Split logic into a compiled `.cjs` module; keep `*.pb.js` as thin routers:

```js
routerAdd('POST', '/api/instance', (c) => {
  return require(`${__hooks}/mothership`).HandleInstanceCreate(c)
}, $apis.requireRecordAuth())
```

Reference: `packages/pockethost/src/mothership-app/pb_hooks/mothership.pb.js`

## Instance admin sync (this repo)

Bootstrap hook reading env and running SQL:

```js
onBootstrap((e) => {
  e.next()
  const { mkLog } = require(`${__hooks}/_ph_lib.js`)
  const log = mkLog('admin-sync')

  const { id, email, tokenKey, passwordHash } = JSON.parse(process.env.ADMIN_SYNC || '{}')
  if (!email) {
    log('Not active - skipped')
    return
  }

  e.app.db().newQuery(`
    insert or replace into _superusers (id, email, tokenKey, password)
    values ({:id}, {:email}, {:tokenKey}, {:passwordHash})
  `).bind({ id, email, tokenKey, passwordHash }).execute()

  log(`Success updating admin credentials ${email}`)
})
```

Reference: `packages/pockethost/src/instance-app/v23/pb_hooks/_ph_admin_sync.pb.js`

## Cron job

```js
cronAdd('cleanup', '0 3 * * *', () => {
  console.log('Running nightly cleanup')
})
```

## PocketHost docs source

More examples: `packages/dashboard/src/routes/(static)/docs/hooks.md`

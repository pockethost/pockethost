# JSVM Hook Examples

Examples below are tagged by PocketBase version where they differ. See [SKILL.md § Version split](SKILL.md#version-split--read-this-first).

## Bootstrap with shared config (≥ v0.23)

```js
// pb_hooks/main.pb.js
onBootstrap((e) => {
  e.next()
  const config = require(`${__hooks}/config/config.js`)
  console.log('Instance initialized!', config.appName)
})
```

## Bootstrap with shared config (≤ v0.22)

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

## Custom route body — bindBody (≥ v0.23, PocketHost mothership)

Prefer this over `JSON.parse(readerToString(e.request.body))` for JSON APIs:

```js
routerAdd('PATCH', '/api/user/trusted-ips', (e) => {
  let data = new DynamicModel({ trusted_ips: [] })
  e.bindBody(data)
  data = JSON.parse(JSON.stringify(data))

  // validate data.trusted_ips, $app.save(record), ...
  return e.json(200, { trusted_ips: data.trusted_ips })
}, $apis.requireAuth())
```

See [request-body.md](request-body.md) for arrays, nested objects, webhooks, and failure modes.

## Custom route (client calls via pb.send)

≤ v0.22:

```js
routerAdd('POST', '/test/:testId', (c) => {
  return c.json(200, { testId: c.pathParam('testId') })
})
```

≥ v0.23:

```js
routerAdd('POST', '/test/{testId}', (e) => {
  return e.json(200, { testId: e.request.pathValue('testId') })
})
```

## Record hook on create (≤ v0.22 naming; ≥ v0.23 uses `*Success` hooks + `e.next()`)

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

## Mothership pattern (≤ v0.22 API — this repo)

Split logic into a compiled `.cjs` module; keep `*.pb.js` as thin routers:

```js
routerAdd('POST', '/api/instance', (c) => {
  return require(`${__hooks}/mothership`).HandleInstanceCreate(c)
}, $apis.requireRecordAuth())
```

Reference: `packages/pockethost/src/mothership-app/pb_hooks/mothership.pb.js`

## Instance admin sync — v22 vs v23 (this repo)

Compare side-by-side:

- ≤ v0.22: `packages/pockethost/src/instance-app/v22/pb_hooks/_ph_admin_sync.pb.js` (`$app.onBeforeServe`, `$app.dao()`, `_admins`)
- ≥ v0.23: `packages/pockethost/src/instance-app/v23/pb_hooks/_ph_admin_sync.pb.js` (`onBootstrap`, `e.app`, `_superusers`)

≥ v0.23 example:

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

## `$app.store()` counter (concurrent-safe)

See [app-store.md](app-store.md) for why JSON boundaries are required.

```js
const STORE_KEY = 'myCounter'

const bumpCounter = (delta) => {
  $app.store().setFunc(STORE_KEY, (raw) => {
    const n = raw ? JSON.parse(raw) : { count: 0 }
    n.count = Math.max(0, (n.count || 0) + delta)
    return JSON.stringify(n)
  })
}

const readCounter = () => {
  const raw = $app.store().get(STORE_KEY)
  return raw ? JSON.parse(raw) : null
}
```

## PocketHost docs source

More examples: `packages/dashboard/src/routes/(static)/docs/hooks.md`

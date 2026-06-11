---
name: pocketbase-jsvm
description: >-
  Writes PocketBase server-side JavaScript in the Goja JSVM: pb_hooks, routerAdd,
  record hooks, cron jobs, and synchronous $app APIs. Use for *.pb.js files,
  pb_hooks, pb_migrations JS, or server-side PocketBase extensions — not the
  npm JS SDK.
---

# PocketBase JSVM

PocketBase embeds a **Goja** JavaScript engine for server-side extensions. Code runs **inside** the PocketBase process — synchronous, no Node/Browser APIs.

Official docs: https://pocketbase.io/docs/js-overview/

## Pre-flight checklist

Before writing hook code, verify:

- [ ] No `async`/`await`, Promises, or `.then()`
- [ ] No `fetch`, `setTimeout`, `setInterval`, DOM APIs
- [ ] No Node built-ins (`fs`, `http`, `path`, etc.)
- [ ] Use `require()` for modules (CommonJS only)
- [ ] Use `$app` / record APIs — not `new PocketBase()`
- [ ] External HTTP via `$http.send()` (sync), not `fetch`

For full environment constraints, see [constraints.md](constraints.md).

## File layout

```
pb_hooks/
├── main.pb.js          # auto-loaded entry hooks
├── config/
│   └── config.js       # shared module (require target)
└── posts.create.pb.js
```

- Only `*.pb.js` files are auto-loaded as hook entry points.
- Shared modules: plain `.js` files loaded via `require()`.
- Use `${__hooks}` for the hooks directory path:

```js
const config = require(`${__hooks}/config/config.js`)
```

## Hook categories

| Category | Examples | Purpose |
|----------|----------|---------|
| Bootstrap | `onBootstrap`, `onAfterBootstrap` | Startup initialization |
| HTTP routes | `routerAdd(method, path, handler, ...middlewares)` | Custom API endpoints |
| Record hooks | `onRecordBeforeCreateRequest`, `onRecordAfterCreateRequest` | Validate/transform on CRUD |
| Model hooks | `onModelBeforeUpdate`, `onModelAfterCreate` | Lower-level DAO events |
| Cron | `cronAdd(id, expr, handler)`, `cronRemove(id)` | Scheduled jobs |
| Middleware | `routerUse(...)` | Global route middleware |

Collection-scoped hooks take the collection name/id as the last argument:

```js
onRecordAfterCreateRequest((e) => {
  const record = e.record
  // ...
}, 'users')
```

## Custom routes

```js
routerAdd('POST', '/test/:testId', (c) => {
  const testId = c.pathParam('testId')
  return c.json(200, { testId })
})
```

With auth middleware:

```js
routerAdd('PUT', '/api/instance/:id', (c) => {
  return require(`${__hooks}/mothership`).HandleInstanceUpdate(c)
}, $apis.requireRecordAuth())
```

Request body and auth info:

```js
const body = $apis.requestInfo(c).data
```

Clients call custom routes via `pb.send()` — see **pocketbase-js-sdk**.

## Record operations

Modern API uses `$app` (prefer over legacy `$app.dao()` where docs show both):

```js
routerAdd('PATCH', '/posts/:postId', (c) => {
  const postId = c.pathParam('postId')
  const { status } = $apis.requestInfo(c).data

  const record = $app.findRecordById('posts', postId)
  record.set('status', status)
  $app.save(record)

  return c.json(200, { record })
})
```

Raw SQL when needed:

```js
$app.db().newQuery('SELECT * FROM posts WHERE id = {:id}')
  .bind({ id: postId })
  .one()
```

## External HTTP

Use synchronous `$http.send()`:

```js
const res = $http.send({
  url: 'https://api.example.com/webhook',
  method: 'POST',
  body: { email: record.get('email') },
  headers: { Authorization: 'Bearer ...' },
})
```

## Environment variables

Only `process.env` is shimmed:

```js
const value = process.env.MY_SECRET || ''
```

PocketHost injects env vars (e.g. `ADMIN_SYNC` in instance hooks).

## Modules

```js
// pb_hooks/utils.js
module.exports = {
  mkLog: (ns) => (...args) => console.log(`[${ns}]`, ...args),
}
```

```js
// pb_hooks/main.pb.js
const { mkLog } = require(`${__hooks}/utils.js`)
const log = mkLog('main')
```

## PocketHost specifics

- User hooks: upload to `pb_hooks/` via FTP; changes restart the instance.
- Template hooks in this repo: `packages/pockethost/src/instance-app/v*/pb_hooks/`
- Mothership hooks: `packages/pockethost/src/mothership-app/pb_hooks/`
- Generated API typings: `packages/pockethost/src/mothership-app/src/types/types.d.ts`
- Pocker sandbox may restrict `$os` — avoid OS-level calls.

## Examples

See [hooks-examples.md](hooks-examples.md) for copy-paste patterns from this repo and PocketHost docs.

## API reference

Browse generated typings in `types.d.ts` for `routerAdd`, `$apis`, `$app`, cron, and record hook signatures.

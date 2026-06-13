---
name: pocketbase-jsvm
description: >-
  Writes PocketBase server-side JavaScript in the Goja JSVM: pb_hooks, routerAdd,
  record hooks, cron jobs, and synchronous $app APIs. Use for *.pb.js files,
  pb_hooks, pb_migrations JS, or server-side PocketBase extensions — not the
  npm JS SDK. Always check target PocketBase version: v0.22 and v0.23+ use
  different JSVM APIs and docs.
---

# PocketBase JSVM

PocketBase embeds a **Goja** JavaScript engine for server-side extensions. Code runs **inside** the PocketBase process — synchronous, no Node/Browser APIs.

## Version split — read this first

**v0.23 is a breaking JSVM boundary.** PocketHost runs both legacy (≤ v0.22) and modern (≥ v0.23) instances. **Always confirm the instance PocketBase version before writing or porting hooks** — do not mix APIs across versions.

| | ≤ v0.22 | ≥ v0.23 |
|---|---------|---------|
| **Overview** | [old/js-overview](https://pocketbase.io/old/docs/js-overview/) | [js-overview](https://pocketbase.io/docs/js-overview/) |
| **API reference** | [old/jsvm](https://pocketbase.io/old/jsvm/) | [jsvm](https://pocketbase.io/jsvm/) |
| **Typings (PocketHost)** | `packages/pockethost/src/instance-app/v22/types/types.d.ts` | `pb_data/types.d.ts` on instance; PocketHost templates in `instance-app/v23/` |
| **Record access** | `$app.dao().findRecordById(...)` | `$app.findRecordById(...)` |
| **Startup hook** | `$app.onBeforeServe().add((e) => { ... })` or `onAfterBootstrap` | `onBootstrap((e) => { e.next(); ... })` |
| **Custom routes** | `(c) =>`, `c.pathParam('id')`, path `/api/foo/:id` | `(e) =>`, `e.request.pathValue('id')`, path `/api/foo/{id}` |
| **Record hooks** | `onRecordAfterCreateRequest`, … | `onRecordAfterCreateSuccess`, … (call `e.next()`) |
| **Admin auth table** | `_admins` (`passwordHash`) | `_superusers` (`password`) |

When in doubt, open the **JSVM reference for that version** — hook names, route handler signatures, and `$app` methods differ. For mothership v0.39 port work, read [v023-upgrade.md](v023-upgrade.md) and the [official JSVM upgrade guide](https://pocketbase.io/v023upgrade/jsvm/).

## Pre-flight checklist

Before writing hook code, verify:

- [ ] **Target PocketBase version** — use the matching JSVM docs (≤ v0.22 vs ≥ v0.23)
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

Names differ by version — check the JSVM reference for your target.

| Category | ≤ v0.22 examples | ≥ v0.23 examples | Purpose |
|----------|------------------|------------------|---------|
| Bootstrap | `onAfterBootstrap`, `$app.onBeforeServe().add` | `onBootstrap` (+ `e.next()`) | Startup initialization |
| HTTP routes | `routerAdd(method, path, handler, ...middlewares)` | same global, different handler arg | Custom API endpoints |
| Record hooks | `onRecordBeforeCreateRequest`, `onRecordAfterCreateRequest` | `onRecordBeforeCreateRequest`, `onRecordAfterCreateSuccess`, … | Validate/transform on CRUD |
| Model hooks | `onModelBeforeUpdate`, `onModelAfterCreate` | still available — verify in JSVM ref | Lower-level DAO events |
| Cron | `cronAdd(id, expr, handler)`, `cronRemove(id)` | same | Scheduled jobs |
| Middleware | `routerUse(...)` | same | Global route middleware |

Collection-scoped hooks take the collection name/id as the last argument:

```js
onRecordAfterCreateRequest((e) => {
  const record = e.record
  // ...
}, 'users')
```

## Custom routes

**≤ v0.22** — Echo-style context `c`, colon params:

```js
routerAdd('POST', '/test/:testId', (c) => {
  const testId = c.pathParam('testId')
  return c.json(200, { testId })
})
```

**≥ v0.23** — request event `e`, brace params:

```js
routerAdd('POST', '/test/{testId}', (e) => {
  const testId = e.request.pathValue('testId')
  return e.json(200, { testId })
})
```

With auth middleware (≤ v0.22 mothership pattern):

```js
routerAdd('PUT', '/api/instance/:id', (c) => {
  return require(`${__hooks}/mothership`).HandleInstanceUpdate(c)
}, $apis.requireRecordAuth())
```

Request body and auth info (≤ v0.22):

```js
const body = $apis.requestInfo(c).data
```

Clients call custom routes via `pb.send()` — see **pocketbase-js-sdk**.

## Record operations

**≥ v0.23** — direct `$app` methods:

```js
routerAdd('PATCH', '/posts/{postId}', (e) => {
  const postId = e.request.pathValue('postId')
  const { status } = $apis.requestInfo(e).data

  const record = $app.findRecordById('posts', postId)
  record.set('status', status)
  $app.save(record)

  return e.json(200, { record })
})
```

**≤ v0.22** — go through `$app.dao()`:

```js
routerAdd('PATCH', '/posts/:postId', (c) => {
  const postId = c.pathParam('postId')
  const { status } = $apis.requestInfo(c).data

  const record = $app.dao().findRecordById('posts', postId)
  record.set('status', status)
  $app.dao().saveRecord(record)

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
- Instance templates: `packages/pockethost/src/instance-app/v22/` (≤ v0.22) and `v23/` (≥ v0.23) — compare `_ph_admin_sync.pb.js` for a side-by-side API diff.
- Mothership hooks (≥ v0.23 after v0.39 migration): `packages/pockethost/src/mothership-app/pb_hooks/` — port guide in [v023-upgrade.md](v023-upgrade.md)
- Typings: `instance-app/v22/types/types.d.ts` (legacy instances); `mothership-app/src/types/types.d.ts` (control plane)
- PocketHost sandbox may restrict `$os` — avoid OS-level calls.

## Examples

See [hooks-examples.md](hooks-examples.md) for copy-paste patterns from this repo and PocketHost docs.

## API reference

1. Pick the **JSVM reference for the target version** (see [Version split](#version-split--read-this-first) above).
2. Cross-check generated typings — v22: `instance-app/v22/types/types.d.ts`; mothership: `mothership-app/src/types/types.d.ts`.
3. On a running instance, `pb_data/types.d.ts` matches that instance's PocketBase version.

---
name: pocketbase-jsvm
description: >-
  Writes PocketBase server-side JavaScript in the Goja JSVM: pb_hooks, routerAdd,
  record hooks, cron jobs, and synchronous $app APIs. Use for *.pb.js files,
  pb_hooks, pb_migrations JS, mothership-app handlers, or server-side PocketBase
  extensions — not the npm JS SDK. Read pockethost-boundary.md before importing
  from packages/pockethost/src/common/ or adding shared code to mothership-app.
---

# PocketBase JSVM

PocketBase embeds **Goja** — not Node, not a browser. Hook code is synchronous; use `$app`, `$http.send()`, and local `require()`.

Official docs: [JS overview](https://pocketbase.io/docs/js-overview/) · [JSVM API](https://pocketbase.io/jsvm/)

## PocketHost: read the boundary first

**`packages/pockethost/src/common/` is Node-only. Never import it from mothership-app.**

Mothership handlers compile to `pb_hooks/mothership.js` via tsdown. Node built-ins (e.g. `node:net`) at module top level crash PocketBase at startup. See **[pockethost-boundary.md](pockethost-boundary.md)** for the full split, build audit, and agent checklist.

Runtime deep-dive: **[runtime-reference.md](runtime-reference.md)** (Goja, goja_nodejs, optional upstream vendoring).

## Pre-flight checklist

Before writing or bundling hook code:

- [ ] No imports from `$common`, `../common/`, or `packages/pockethost/src/common/`
- [ ] No `node:*` built-ins (`net`, `fs`, `path`, `crypto`, …)
- [ ] No `async`/`await`, Promises, `.then()` in handlers
- [ ] No `fetch`, `setTimeout`, `setInterval`, DOM APIs
- [ ] CommonJS `require()` for shared modules under `${__hooks}/`
- [ ] External HTTP via `$http.send()` (sync), not `fetch`
- [ ] After mothership changes: `pnpm build` in `mothership-app/` and `rg 'require\("node:' pb_hooks/mothership.js` → empty

For full environment constraints, see [constraints.md](constraints.md).

## File layout

```
pb_hooks/
├── main.pb.js          # auto-loaded entry hooks
├── config/
│   └── config.js       # shared module (require target)
└── posts.create.pb.js
```

PocketHost:

| App | Hook source | Output |
|-----|-------------|--------|
| Mothership | `mothership-app/src/lib/handlers/` | `mothership-app/pb_hooks/mothership.js` |
| Instance templates | `instance-app/v*/pb_hooks/` | shipped in Docker image |

- Only `*.pb.js` files are auto-loaded as hook entry points (plus compiled routers like `mothership.pb.js`).
- Shared JSVM modules: plain `.js` or tsdown bundle, loaded via `require(\`${__hooks}/…\`)`.
- Typings: `mothership-app/src/types/types.d.ts`

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

Prefer `$app` (see JSVM reference for full API):

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

```js
const res = $http.send({
  url: 'https://api.example.com/webhook',
  method: 'POST',
  body: { email: record.get('email') },
  headers: { Authorization: 'Bearer ...' },
})
```

## Environment variables

```js
const value = process.env.MY_SECRET || ''
```

PocketHost injects env vars (e.g. `MOTHERSHIP_CLOUDFLARE_*` in mothership).

## Modules

Handlers run in **isolated contexts** ([docs](https://pocketbase.io/docs/js-overview/#handlers-scope)). Share code via `require()`:

```js
// pb_hooks/utils.js
module.exports = {
  mkLog: (ns) => (...args) => console.log(`[${ns}]`, ...args),
}
```

```js
onAfterBootstrap((e) => {
  const { mkLog } = require(`${__hooks}/utils.js`)
  mkLog('main')('ready')
})
```

## Examples

See [hooks-examples.md](hooks-examples.md) for mothership and instance patterns from this repo.

## API reference

- Generated typings: `mothership-app/src/types/types.d.ts`
- Official: https://pocketbase.io/jsvm/

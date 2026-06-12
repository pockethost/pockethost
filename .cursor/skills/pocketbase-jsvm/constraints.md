# JSVM Environment Constraints

The JSVM is **Goja** inside PocketBase — not Node, not a browser. See [runtime-reference.md](runtime-reference.md) and [PocketBase JS overview](https://pocketbase.io/docs/js-overview/).

## PocketHost boundary

**Never import `packages/pockethost/src/common/` into mothership-app.** That tree is Node-only; tsdown will bundle `node:*` and npm deps into `pb_hooks/mothership.js` and crash PocketBase. Details: [pockethost-boundary.md](pockethost-boundary.md).

## Unavailable (do not use in hooks)

| Category | Not available |
|----------|---------------|
| Node built-ins | `node:net`, `node:fs`, `node:path`, `node:crypto`, `node:http`, … (throws `No such built-in module`) |
| Async | Promises, `async`/`await`, `.then()` in hook handlers |
| Browser | `window`, `document`, `fetch`, DOM events |
| Timers | `setTimeout`, `setInterval` |
| Full Node `process` | Only `process.env` shim |
| npm “Node” packages | Anything pulling the above at load time |

## Available (prefer in this order)

| Category | Available |
|----------|-----------|
| PocketBase globals | `$app`, `$apis`, `$http`, `$os`, `$security`, `$filesystem`, … — [JSVM ref](https://pocketbase.io/jsvm/) |
| Modules | CommonJS `require()` for **local** files under `pb_hooks/` |
| Env | `process.env` shim |
| ES syntax | Most ES6+ (arrows, classes, destructuring, optional chaining, Map, Set; engine not 100% spec-complete) |
| goja_nodejs (partial) | Some of `console`, `buffer`, `url`, `util`, `process` — **do not depend on these** for new code |

**Note:** JSVM typings list a Go `net` namespace; that is **not** `require("node:net")`.

## Common mistakes

```js
// WRONG — Node built-in (crashes at load time in bundled mothership.js)
const { isIPv4 } = require('node:net')

// WRONG — async not supported in handlers
async function handler() {
  const data = await fetch(url)
}

// WRONG — Node module
const fs = require('fs')

// WRONG — npm SDK belongs in client apps
const pb = new PocketBase('http://127.0.0.1:8090')

// WRONG — PocketHost: imports Node common/ into mothership handler
import { validateX } from '$common'

// RIGHT — sync hook with $app
onRecordBeforeCreateRequest((e) => {
  e.record.set('slug', e.record.get('title').toLowerCase())
}, 'posts')

// RIGHT — sync external call
const res = $http.send({ url: 'https://api.example.com', method: 'GET' })

// RIGHT — pure JS validation in mothership-app/src/lib/util/
function isIPv4(s) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(s) // simplify as needed
}
```

## Porting Node code

1. Move logic to `mothership-app/src/lib/` (JSVM-safe).
2. Replace Node APIs with PocketBase globals or pure JS.
3. Rebuild hooks and audit bundle (see [pockethost-boundary.md](pockethost-boundary.md)).

[pocketbase-node](https://www.npmjs.com/package/pocketbase-node) offers a small Node-compat subset for JSVM — use only when PocketBase-native APIs are insufficient.

## PocketHost docs source

Full write-up: `packages/dashboard/src/routes/(static)/docs/js/+page.md`

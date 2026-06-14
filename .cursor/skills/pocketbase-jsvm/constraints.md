# JSVM Environment Constraints

The JSVM is **Goja** (Go-based ES interpreter), not Node or a browser.

**Version note:** Goja constraints are shared across PocketBase versions, but hook/route APIs differ at v0.23 — see [SKILL.md § Version split](SKILL.md#version-split--read-this-first). Use [old docs](https://pocketbase.io/old/docs/js-overview/) for ≤ v0.22 and [current docs](https://pocketbase.io/docs/js-overview/) for ≥ v0.23.

## Unavailable

| Category | Not available |
|----------|---------------|
| Async | Promises, `async`/`await`, `.then()` |
| Browser | `window`, `document`, `fetch`, DOM events |
| Timers | `setTimeout`, `setInterval` |
| Node | `fs`, `http`, `path`, `crypto` (Node), etc. |
| Other | `BigInt`, `Intl`, full RegExp feature set |

## Available

| Category | Available |
|----------|-----------|
| Modules | CommonJS `require()` / `module.exports` for **your** files |
| Env | `process.env` shim only |
| HTTP | `$http.send()` (synchronous) |
| ES syntax | ES6–ES2020 mostly: arrows, classes, template literals, destructuring, spread/rest, optional chaining, nullish coalescing, Map, Set |
| PocketBase | `$app`, `$apis`, `$os` (may be restricted on PocketHost), hook globals |

## Common mistakes

```js
// WRONG — async not supported
async function handler() {
  const data = await fetch(url)
}

// WRONG — Node module
const fs = require('fs')

// WRONG — SDK belongs in client apps
const pb = new PocketBase('http://127.0.0.1:8090')
await pb.collection('posts').create({ title: 'x' })

// RIGHT — sync hook with $app
onRecordBeforeCreateRequest((e) => {
  e.record.set('slug', e.record.get('title').toLowerCase())
}, 'posts')

// RIGHT — sync external call
const res = $http.send({ url: 'https://api.example.com', method: 'GET' })
```

## Porting Node code

[pocketbase-node](https://www.npmjs.com/package/pocketbase-node) provides a subset of Node APIs compatible with JSVM. Prefer PocketBase-native APIs (`$app`, `$http`) first.

## PocketHost mothership build boundary

TypeScript handlers compile with **tsdown** into `pb_hooks/mothership.js` and run in Goja — not Node.

- Shared hook logic lives in `packages/pockethost/src/common/` — must be **JSVM-safe**.
- Import via `$common/<file>` subpaths (`"$common/*": ["../common/*"]` in mothership tsconfig). Avoid runtime `$common` barrel imports.
- After hook changes: `pnpm --filter pockethost-mothership-app build` — **zero** `[UNRESOLVED_IMPORT]` warnings.

See [.cursor/rules/mothership-hooks.mdc](../../../rules/mothership-hooks.mdc).

## PocketHost docs source

Full write-up: `packages/dashboard/src/routes/(static)/docs/js/+page.md`

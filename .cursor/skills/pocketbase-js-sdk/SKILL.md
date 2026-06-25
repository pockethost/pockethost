---
name: pocketbase-js-sdk
description: >-
  Uses the official PocketBase JavaScript SDK (npm pocketbase) from browser or
  Node: authStore, collection CRUD, realtime subscribe, file uploads, and
  pb.send for custom routes. Use when writing client apps, dashboard code, or
  Node scripts that call PocketBase over HTTP with async/await — not pb_hooks.
---

# PocketBase JavaScript SDK

The npm `pocketbase` package is an **async HTTP client** for PocketBase. It runs in browsers and Node — **not** inside the JSVM.

Official SDK: https://github.com/pocketbase/js-sdk

## Not the JSVM

| JS SDK | JSVM (`pb_hooks`) |
|--------|-------------------|
| `async`/`await`, Promises | Synchronous only |
| `new PocketBase(url)` | `$app`, `routerAdd`, `onRecord*` |
| Browser / Node | Embedded in PocketBase binary |

Never use `async`/`await` or `new PocketBase()` inside `*.pb.js` hook files.

## Basic usage

```ts
import PocketBase from 'pocketbase'

const pb = new PocketBase('https://my-project.pockethost.io')

// Auth
await pb.collection('users').authWithPassword(email, password)
pb.authStore.isValid // true when logged in
pb.authStore.model   // auth record
pb.authStore.clear() // logout

// CRUD
const list = await pb.collection('posts').getList(1, 50, { filter: 'status = "published"' })
const one = await pb.collection('posts').getOne('RECORD_ID')
await pb.collection('posts').create({ title: 'Hello' })
await pb.collection('posts').update('RECORD_ID', { title: 'Updated' })
await pb.collection('posts').delete('RECORD_ID')
```

## Auth patterns

```ts
// Register (auth collection)
await pb.collection('users').create({ email, password, passwordConfirm: password })

// OAuth2
await pb.collection('users').authWithOAuth2({ provider: 'google' })

// Refresh token
await pb.collection('users').authRefresh()

// Listen for auth changes
pb.authStore.onChange((token, model) => { /* ... */ })
```

## Realtime

```ts
const unsub = await pb.collection('posts').subscribe('*', (e) => {
  console.log(e.action, e.record)
})
// later
unsub()
```

Always unsubscribe on component teardown to avoid leaks.

## Custom routes (hooks → client)

Hooks registered with `routerAdd` are called from the client via `pb.send()`:

```ts
const result = await pb.send('/test/theTestId', { method: 'POST' })
```

Auth headers are attached automatically when `authStore` is valid.

### JSON body shape

Pass a plain object as `body`. The SDK serializes it as JSON with the correct `Content-Type`:

```ts
await pb.send('/api/user/trusted-ips', {
  method: 'PATCH',
  body: { trusted_ips: ['203.0.113.5/32'] },
})
```

On the hook side (≥ v0.23), read with `e.bindBody(new DynamicModel({ trusted_ips: [] }))` — not manual `JSON.parse` on `e.request.body`. See **pocketbase-jsvm** [request-body.md](../pocketbase-jsvm/request-body.md).

## File uploads

```ts
const formData = new FormData()
formData.append('title', 'Photo')
formData.append('image', file)
await pb.collection('photos').create(formData)
```

## Errors

```ts
import { ClientResponseError } from 'pocketbase'

try {
  await pb.collection('posts').create(data)
} catch (err) {
  if (err instanceof ClientResponseError) {
    console.log(err.status, err.response)
  }
}
```

## Architecture note

Prefer **direct client → PocketBase** access with API rules. Avoid proxying through SvelteKit/Next server loaders unless you have a specific reason (see **pocketbase** skill, antipattern doc).

For privileged operations, add a JS hook route and call it with `pb.send()` instead of server-side SDK calls.

## This monorepo

Import SDK types and class from `pockethost/common`, not directly from `pocketbase`:

```ts
import { PocketBase, ClientResponseError, BaseAuthStore } from 'pockethost/common'
```

Prefer factory wrappers over raw `new PocketBase()` in app code. See [pockethost-client.md](pockethost-client.md).

## SDK reference

- Auth: https://github.com/pocketbase/js-sdk#authentication
- CRUD: https://github.com/pocketbase/js-sdk#records-crud
- Realtime: https://github.com/pocketbase/js-sdk#realtime-subscriptions

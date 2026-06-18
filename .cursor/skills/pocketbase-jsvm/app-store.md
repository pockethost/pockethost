# `$app.store()` and Goja concurrency

PocketBase hooks run in **Goja** on a **pool of JS runtimes** (one per concurrent request). `$app.store()` is thread-safe on the **Go** side, but **JavaScript objects stored in it are not safe to share across runtimes**.

## What goes wrong

```js
// UNSAFE — stores a live Goja object
$app.store().set('stats', { running: 0, idle: 0 })

routerUse((e) => {
  e.next()
  const stats = $app.store().get('stats') // same Goja object ref in every VM
  stats.running += 1 // concurrent mutation → racy panic
})
```

Under concurrent load (`ab -n 100 -c 10`):

1. Request A and B run on **different Goja VMs**.
2. Both `get('stats')` return a reference to the **same** underlying Goja object.
3. In-place mutation (`stats.running += 1`, `obj.a = 2`) crosses VM boundaries without a JS lock.
4. PocketBase panics (same class of failure reported in [PB #7737](https://github.com/pocketbase/pocketbase/issues/7737)).

`setFunc` alone does **not** fix this if you mutate `old` in place and return the same reference:

```js
// STILL UNSAFE
$app.store().setFunc('stats', (old) => {
  const stats = old || { running: 0 }
  stats.running += 1 // mutates shared Goja object
  return stats
})
```

## Fix: JSON string boundaries

Treat `$app.store()` as a **JSON string registry**. Strings are primitives — they copy safely across VM boundaries.

### Read-modify-write (incremental counters)

```js
$app.store().setFunc('stats', (raw) => {
  const stats = raw ? JSON.parse(raw) : { running: 0, idle: 0 }
  stats.running += 1
  return JSON.stringify(stats)
})
```

`setFunc` is one atomic RMW per call. It does **not** permanently override `get`/`set` for that key.

### Full replace (boot recount, cron refresh)

```js
$app.store().set('stats', JSON.stringify({ running: 42, idle: 7 }))
```

### Read-only (SSE broadcast, route response)

```js
const raw = $app.store().get('stats')
const stats = raw ? JSON.parse(raw) : null
```

Always `JSON.parse` after `get`. The store holds a string, not a usable live object.

## PocketHost mothership

Live admin stats use `$app.store()` for incremental platform counts and view rollups:

| Key | Source | Pattern |
|-----|--------|---------|
| `phLivePlatformCounts` | `adminPlugins/platformStats.ts` | `setFunc` deltas + `set` on full recount |
| `phLiveViewStats` | `adminPlugins/viewStats.ts` | `set` on cron refresh; `get` + parse for broadcast |

Shared helper (mothership hooks only):

```typescript
import { getAppStoreJson, setAppStoreJson, updateAppStoreJson } from '$util/appStoreJson'
```

- `getAppStoreJson` — `get` + `JSON.parse` (expects JSON string values only)
- `setAppStoreJson` — `set` + `JSON.stringify`
- `updateAppStoreJson` — `setFunc` + parse → updater → stringify

After hook changes: `pnpm --filter pockethost-mothership-app build`.

## Checklist

- [ ] Never `set(key, { ... })` a plain object that will be read and mutated elsewhere
- [ ] Never mutate the return value of `get(key)` in place
- [ ] Incremental updates: `setFunc` + parse local copy + `JSON.stringify` return
- [ ] Full replace: `set(key, JSON.stringify(value))`
- [ ] Reads: `JSON.parse(get(key))` into a **local** object before use
- [ ] Multiple fields in one event: prefer **one** `setFunc` (or accept two-step eventual consistency + cron heal)

## Related

- [constraints.md](constraints.md) — general Goja limits
- [SKILL.md](SKILL.md) — hook layout and version split
- `.cursor/skills/pocketbase-admin-plugins/realtime-and-sse.md` — SSE topics that use store counters
- `.cursor/rules/mothership-hooks.mdc` — tsdown build boundary

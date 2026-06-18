# Realtime / SSE in admin plugins

PocketBase admin uses the **JS SDK realtime client** over **Server-Sent Events (SSE)**. Admin plugins combine:

1. **Collection subscriptions** — record create/update/delete on a collection.
2. **Custom topics** — arbitrary string channels pushed from `pb_hooks`.

Reference implementation: mothership **Live** plugin — `pb_admin_ext/live/main.js` + `src/lib/handlers/adminPlugins/`.

## Transport (browser)

```js
// Collection CRUD events (SSE under the hood)
app.pb.collection('edges').subscribe('*', (e) => {
  // e.action: 'create' | 'update' | 'delete'
  // e.record
})

// Custom topic (not tied to a collection)
app.pb.realtime.subscribe('mothership/live/platform', (payload) => {
  applyPlatformPayload(platform, payload)
})
```

Network tab shows a long-lived **`realtime`** request with `type: eventsource`.

- Auth: uses the **superuser session** already held by `app.pb` in the admin SPA.
- Subscribe once per page lifetime; guard with a flag (`edgesSubscribed`) so route re-entry does not duplicate listeners.
- `.catch()` on subscribe promises; ignore `ClientResponseError 0` / "autocancelled" on navigations (see [client-api.md](client-api.md)).

## Custom topics (server)

### 1. Define topic constant (shared conceptually with client)

```ts
// platformStats.ts
export const LIVE_PLATFORM_TOPIC = 'mothership/live/platform'
```

### 2. Gate subscribe in `onRealtimeSubscribeRequest`

Only **superusers** may join operator topics:

```js
onRealtimeSubscribeRequest((e) => {
  for (const sub of e.subscriptions) {
    if (sub === LIVE_PLATFORM_TOPIC && !e.hasSuperuserAuth()) {
      throw new ForbiddenError('Superuser required')
    }
  }
  e.next()

  // Push snapshot immediately on subscribe
  for (const sub of e.subscriptions) {
    if (sub === LIVE_PLATFORM_TOPIC) {
      sendLivePlatformStatsToClient(e.client)
    }
  }
})
```

### 3. Broadcast from hooks / cron

```ts
export const broadcastLivePlatformStats = () => {
  const stats = getLivePlatformStats()
  if (!stats) return

  const message = new SubscriptionMessage({
    name: LIVE_PLATFORM_TOPIC,
    data: JSON.stringify(stats),
  })

  const clients = $app.subscriptionsBroker().clients()
  for (const clientId in clients) {
    if (clients[clientId].hasSubscription(LIVE_PLATFORM_TOPIC)) {
      clients[clientId].send(message)
    }
  }
}
```

Call `broadcastLivePlatformStats()` after:

- Incremental counter updates in record hooks (`onRecordAfter*Success`).
- Manual refresh route (`POST /api/admin/live/platform/refresh`).
- Boot init (`onBootstrap` → recount + broadcast).

### 4. Client payload parsing

Custom messages may arrive as JSON string, wrapped object, or already parsed — normalize defensively:

```js
function parsePlatformPayload(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  if (raw.statusCounts) return raw
  if (raw.data && typeof raw.data === 'object') return raw.data
  return null
}
```

## Collection subscribe vs custom topic

| Use case | Mechanism | Server work |
|----------|-----------|-------------|
| Mirror a collection in the UI | `collection('edges').subscribe('*')` | None — PB emits automatically |
| Aggregated counters, cross-collection stats | Custom topic + hooks | Maintain `$app.store()` counters; broadcast on change |
| Periodic rollups (view stats) | Custom topic + `cronAdd` | Cron recounts/broadcasts every N minutes |
| One-off operator actions | `app.pb.send('/api/admin/...')` | Custom route + optional broadcast after |

Live plugin uses **both**:

- `edges` collection subscribe → edge heartbeat stats JSON, sparkline history.
- `mothership/live/platform` → incremental instance/user counts from hooks.
- `mothership/live/view-stats` → cron-refreshed subscriber/new-user rollups.

## Incremental vs full recount

**Incremental (hooks):** cheap, realtime. Example: instance status change adjusts `$app.store()` counter by ±1, then broadcast. Store values must be **JSON strings** at VM boundaries — use `setFunc` + parse/stringify, not in-place mutation of `get()` results ([app-store.md](../pocketbase-jsvm/app-store.md); mothership: `$util/appStoreJson`).

**Full recount (refresh route / boot):** corrects drift. Example: `recountLivePlatformStats()` SQL counts all statuses, replaces store, broadcast.

Expose manual refresh in UI when operators need DB truth:

```js
await app.pb.send('/api/admin/live/platform/refresh', { method: 'POST' })
```

Register route with `$apis.requireSuperuserAuth()`.

## Client page wiring pattern

```js
app.routes.superuserOnly('#/live', () => {
  if (!livePage) {
    livePage = { data: store({…}), platform: store({…}) }
    startLivePage(livePage) // loads initial data + starts subscriptions once
  }
  return t.div(…render from stores…)
})

function startLivePage({ data, platform }) {
  loadEdges() // initial getFullList

  if (!data.edgesSubscribed) {
    data.edgesSubscribed = true
    app.pb.collection('edges').subscribe('*', onEdgeEvent)
  }
  if (!data.platformSubscribed) {
    data.platformSubscribed = true
    app.pb.realtime.subscribe(LIVE_PLATFORM_TOPIC, (e) => applyPlatformPayload(platform, e))
  }
}
```

Keep subscription setup **outside** the route render function body after first init, not inside every render.

## `$autoCancel` on REST reads

```js
const NO_AUTO_CANCEL = { $autoCancel: false }
await app.pb.collection('edges').getFullList({ sort: 'edge_id', ...NO_AUTO_CANCEL })
```

Parallel `getList`/`getFullList` on the same collection cancel each other by default. Realtime + initial load + refresh need `$autoCancel: false` or serialized fetches.

## Security

- Custom topics must check `e.hasSuperuserAuth()` in `onRealtimeSubscribeRequest`.
- Custom REST routes: `$apis.requireSuperuserAuth()`.
- Never embed superuser tokens in `main.js` — rely on admin session.
- Topic names: use a namespace prefix (`mothership/live/…`) to avoid collisions.

## Debugging

| Symptom | Check |
|---------|-------|
| No `realtime` eventsource in Network | Subscribe not called; auth failure; page left before connect |
| Subscribe 403 | Server hook rejected non-superuser |
| UI stale but SSE connected | Payload parse mismatch; store tick not bumped |
| Counts drift | Missing hook on some code path; run manual refresh recount |
| Duplicate events | Subscribed multiple times — guard with boolean flag |

## Related skills

- Server hooks / `SubscriptionMessage`: **pocketbase-jsvm**
- Browser SDK details: **pocketbase-js-sdk**
- Shablon ticks vs imperative updates: [shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md)

# Admin Plugin Examples

All examples assume PocketBase **≥0.37**. Client snippets go in `main.js`. Server snippets go in `pb_hooks/*.pb.js`.

## 1. Hello page + header link

**`pb_admin_ext/hello/main.js`**

```js
app.store.headerLinks.push({
  href: '#/hello',
  icon: 'ri-hand-heart-line',
  label: 'Hello',
})

app.routes.superuserOnly('#/hello', () => {
  return t.div(
    { className: 'page' },
    t.h1(null, 'Hello'),
    t.p(null, 'Admin plugin is loaded.'),
  )
})
```

**`pb_hooks/admin_plugins.pb.js`**

```js
$app.onServe().bindFunc((e) => {
  e.uiExtensions.push({
    name: 'hello',
    fs: $os.dirFS(`${__hooks}/../pb_admin_ext/hello`),
  })
  e.next()
})
```

## 2. Simple stats table (view collection)

Assumes a view collection `verified_users` exists.

**`pb_admin_ext/verified/main.js`**

```js
app.store.headerLinks.push({
  href: '#/verified-users',
  icon: 'ri-user-star-line',
  label: 'Verified',
})

app.routes.superuserOnly('#/verified-users', () => {
  const data = store({ rows: [], error: '' })

  async function load() {
    try {
      data.rows = await app.pb.collection('verified_users').getFullList({ sort: '-created' })
    } catch (err) {
      data.error = String(err)
    }
  }
  load()

  return t.div(
    { className: 'page' },
    t.h1(null, 'Verified users'),
    () => (data.error ? t.pre(null, data.error) : t.pre(null, JSON.stringify(data.rows, null, 2))),
  )
})
```

Pair with a PocketBase **view collection** (not legacy SQL views) for mothership operator reporting.

## 3. Stylesheet + logo override

**`pb_admin_ext/branding/main.js`**

```js
document.head.appendChild(
  t.link({ rel: 'stylesheet', href: '/_/extensions/branding/theme.css' }),
)

app.store.headerLogo = '/_/extensions/branding/logo.svg'
```

## 4. Header badge via mount hook

**`pb_admin_ext/badge/main.js`**

```js
document.addEventListener('mount:appHeader', (e) => {
  const el = t.span({ className: 'label label-warning m-l-sm' }, 'STAGING')
  e.detail.appendChild(el)
})
```

Use mount names from DevTools (`data-pb` attributes). Names vary by PocketBase version.

## 5. Multiple extensions

**`pb_hooks/admin_plugins.pb.js`**

```js
const extRoot = `${__hooks}/../pb_admin_ext`

$app.onServe().bindFunc((e) => {
  ;['hello', 'verified', 'branding'].forEach((name) => {
    e.uiExtensions.push({ name, fs: $os.dirFS(`${extRoot}/${name}`) })
  })
  e.next()
})
```

Each subdirectory has its own `main.js`. All are bundled into `/_/extensions.js`.

## 6. Mothership hook registration (TypeScript → tsdown)

Add to a hooks file imported from `src/hooks/index.ts`:

```ts
// src/lib/handlers/adminPlugins/hooks.ts
$app.onServe().bindFunc((e) => {
  e.uiExtensions.push({
    name: 'operator-stats',
    fs: $os.dirFS(`${__hooks}/../pb_admin_ext/operator-stats`),
  })
  e.next()
})
```

```ts
// src/hooks/index.ts
import '../lib/handlers/adminPlugins/hooks'
```

Run `pnpm --filter pockethost-mothership-app build`. Ship `pb_admin_ext/` separately on deploy.

## 7. Live operator dashboard (realtime + maps)

Mothership reference: `pb_admin_ext/live/` + `src/lib/handlers/adminPlugins/`.

- **Collection SSE:** `edges.subscribe('*')` for heartbeat stats.
- **Custom topics:** `mothership/live/platform`, `mothership/live/view-stats` — server `SubscriptionMessage` + `onRealtimeSubscribeRequest` superuser gate.
- **Maps:** Leaflet mounted imperatively; OSM tiles (CSP); see [shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md).

See [realtime-and-sse.md](realtime-and-sse.md) for the full server/client contract.

## Anti-patterns

- Putting client `main.js` logic in `pb_hooks` — Goja is ES5-only, no DOM.
- Using `$http.send` in `main.js` — that is server-side JSVM.
- Hardcoding superuser tokens in extension JS — use `app.pb` session.
- Expecting admin plugins on PB ≤0.36 instances.
- Using `oncreate` / `data-*` for widget lifecycle — use imperative DOM mount.
- Subscribing to custom realtime topics without server-side superuser check.
- Bumping a route-level store tick on high-frequency timers — update imperative layers instead.

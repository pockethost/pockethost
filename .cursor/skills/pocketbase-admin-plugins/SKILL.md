---
name: pocketbase-admin-plugins
description: >-
  Builds PocketBase superuser admin UI extensions (admin plugins) on PB ≥0.37:
  ServeEvent.uiExtensions, client main.js, window.app SPA hooks, Shablon UI,
  reactive stores, CSP, SSE/realtime topics. Use when extending the PocketBase
  admin dashboard, operator pages, custom collection tabs/fields, live dashboards,
  or mothership post-v0.39 operator tooling — not for pb_hooks server logic alone
  (see pocketbase-jsvm) or external SPAs.
---

# PocketBase Admin Plugins (UI Extensions)

PocketBase **≥0.37** (including mothership **0.39.\***) ships a rewritten superuser dashboard with an **experimental UI extension system**. Extensions add pages, header links, collection tabs, field types, modals, and DOM hooks inside the built-in admin SPA.

**Status:** APIs are **experimental and undocumented** on pocketbase.io until Stage 2 / v1.0-rc. Expect breaking changes. Source of truth: [GitHub discussion #7612](https://github.com/pocketbase/pocketbase/discussions/7612).

## Architecture (two layers)

| Layer | Runs in | Purpose |
|-------|---------|---------|
| **Server registration** | JSVM (`pb_hooks`) or Go `OnServe` | Mount static assets at `/_/extensions/{name}/*`, bundle `main.js` into `/_/extensions.js` |
| **Client registration** | Browser (admin SPA) | `main.js` uses global `window.app` to register routes, store fields, modals, mount hooks |

```
pb_hooks/register.pb.js          extensions/my-plugin/
        │                              ├── main.js      ← client entry (required for UI hooks)
        │ onServe → uiExtensions       ├── style.css
        └──────────────────────────────└── …
                    │
                    ▼
        GET /_/extensions/my-plugin/*
        GET /_/extensions.js          ← concatenates all main.js files
                    │
                    ▼
        Admin SPA loads extensions.js → window.app hooks fire
```

## Version gate

| PocketBase | Admin plugins |
|------------|---------------|
| ≤ v0.36 | **Not available** (old Svelte admin, no extension API) |
| ≥ v0.37 | Experimental UI extensions |
| Mothership 0.39.\* | Supported (PocketHost control plane) |

Confirm target version before writing extension code. Customer instances must run **≥0.37** to load admin plugins.

## Which skill to use

| Task | Skill |
|------|-------|
| Register extension dir, `onServe`, static FS | **pocketbase-admin-plugins** (this) + [server-registration.md](server-registration.md) |
| Client pages, `window.app`, Shablon | **pocketbase-admin-plugins** + [client-api.md](client-api.md) |
| Reactive UI, maps, CSP, imperative DOM | [shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md) |
| SSE, custom topics, collection subscribe | [realtime-and-sse.md](realtime-and-sse.md) |
| Custom API routes, record hooks, cron | **pocketbase-jsvm** |
| External customer-facing dashboard | **pocketbase-js-sdk** + separate SPA |

## Quick start (JSVM)

### 1. Directory layout

Place static assets next to hooks (paths are your choice; keep them stable across deploys):

```
pb_hooks/
  admin_plugins.pb.js
pb_admin_ext/
  hello/
    main.js
    style.css
```

### 2. Server registration

```js
// pb_hooks/admin_plugins.pb.js
$app.onServe().bindFunc((e) => {
  e.uiExtensions.push({
    name: 'hello',
    fs: $os.dirFS(`${__hooks}/../pb_admin_ext/hello`),
  })
  e.next()
})
```

Each `name` becomes the URL segment `/_/extensions/{name}/…`. Invalid entries (empty name or missing FS) are skipped.

### 3. Client entry (`main.js`)

Runs in the **browser** (modern JS, async/await OK). **Not** Goja JSVM rules.

```js
// pb_admin_ext/hello/main.js
app.store.headerLinks.push({
  href: '#/hello',
  icon: 'ri-hand-heart-line',
  label: 'Hello',
})

app.routes.superuserOnly('#/hello', () => {
  return t.div({ className: 'page' }, t.h1(null, 'Hello from an admin plugin'))
})
```

Open the mothership/instance admin UI, sign in as superuser, click the new header link.

## Pre-flight checklist

- [ ] Target PocketBase **≥0.37**
- [ ] Extension `name` is unique, URL-safe (used in `/_/extensions/{name}/`)
- [ ] `main.js` exists at FS root if you need client hooks (optional for static-only assets)
- [ ] Asset URLs in `main.js` use `/_/extensions/{name}/…` paths
- [ ] Server hook calls `e.next()` in `onServe`
- [ ] Client code uses `app.pb` (superuser SDK) for data, not raw tokens in source
- [ ] Event handlers use **`onclick`** (lowercase), not `onClick`
- [ ] Third-party widgets (maps, charts) use **imperative mount** — not Shablon lifecycle hooks
- [ ] Realtime: collection subscribe and/or custom topics gated to superuser on server
- [ ] Treat APIs as unstable until PocketBase Stage 2 docs ship

## Shablon vs plain JS

The admin UI uses **Shablon** (`t.div`, `t.button`, …). Shablon is optional in extensions. Plain DOM works:

```js
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '/_/extensions/hello/style.css'
document.head.appendChild(link)
```

**Important:** Shablon is **not** Mithril. `oncreate` / `data-*` attrs / `ref` callbacks are unreliable for plugin routes. Use `id` + imperative DOM for maps and other third-party widgets. See [shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md).

Explore live APIs: open admin UI → DevTools → `console.log(app)`.

## Security note

Extensions run with **full superuser privileges** in the browser and serve from public `/_/` routes (CSP applies). Do not ship untrusted third-party extension code. PocketBase will warn about this in future docs ([#7612](https://github.com/pocketbase/pocketbase/discussions/7612)).

## PocketHost

Mothership (0.39) and customer instances (≥0.37) differ in deploy path. See [pockethost.md](pockethost.md).

Typical mothership use case: **Live operator dashboard** (`pb_admin_ext/live/`) — platform SSE topics, edge collection subscribe, Leaflet heatmaps. See [realtime-and-sse.md](realtime-and-sse.md) and [shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md).

Other use cases (backlog): operator stats pages replacing legacy SQL views — view collections + admin plugin charts/tables.

## Reference files

| File | Contents |
|------|----------|
| [server-registration.md](server-registration.md) | JSVM + Go registration, FS layout, routes |
| [client-api.md](client-api.md) | `window.app` — routes, store, modals, field types, mount events |
| [shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md) | Reactive stores, ticks, CSP, imperative DOM / Leaflet |
| [realtime-and-sse.md](realtime-and-sse.md) | Collection subscribe, custom SSE topics, server broadcast |
| [examples.md](examples.md) | Copy-paste patterns |
| [pockethost.md](pockethost.md) | Mothership tsdown, phio/FTP deploy, dev workflow |

## Official links

- Extension overview (maintainer): https://github.com/pocketbase/pocketbase/discussions/7612
- JSVM `ServeEvent.uiExtensions`: https://pocketbase.io/jsvm/interfaces/core.ServeEvent.html
- JSVM `UIExtension`: https://pocketbase.io/jsvm/interfaces/core.UIExtension.html
- UI source (Shablon): https://github.com/pocketbase/pocketbase/tree/master/ui

# Admin Plugin — Client API (`window.app`)

Client code lives in extension `main.js`. It runs in the **browser** inside the superuser SPA. Modern JavaScript is fine (async/await, fetch, DOM APIs).

**Experimental.** Summarized from [discussion #7612](https://github.com/pocketbase/pocketbase/discussions/7612). Run `console.log(app)` in DevTools for the live object on your PocketBase version.

## Global objects

| Global | Role |
|--------|------|
| `app` | Main UI controller — routes, store, modals, components |
| `app.pb` | PocketBase **superuser** JS SDK instance (authenticated in admin) |
| `t` | Shablon templating (`t.div`, `t.button`, …) — optional |
| `store()` | Shablon reactive store helper |

## Register SPA pages

Superuser-only hash routes:

```js
app.routes.superuserOnly('#/custom', (route) => {
  const data = store({ records: [] })

  async function loadRecords() {
    data.records = await app.pb.collection('example').getFullList()
  }
  loadRecords()

  return t.div({ className: 'page' }, () => JSON.stringify(data.records))
})
```

Link from header:

```js
app.store.headerLinks.push({
  href: '#/custom',
  icon: 'ri-article-line', // Remix Icon class
  label: 'Custom page',
})
```

## Global store (branding, links)

```js
app.store.mainLogo = '/_/extensions/example/newMainLogo.svg'
app.store.headerLogo = '/_/extensions/example/newHeaderLogo.svg'

app.store.headerLinks.push({
  href: '#/reports',
  icon: 'ri-bar-chart-line',
  label: 'Reports',
})
```

## Modals

```js
const modal = t.div(
  { className: 'modal popup' },
  t.header({ className: 'modal-header' }, t.h5({ className: 'm-auto' }, 'Example')),
  t.div(
    { className: 'modal-content' },
    t.form(
      {
        id: 'myForm',
        onsubmit: (e) => {
          e.preventDefault()
        },
      },
      t.div(
        { className: 'field' },
        t.label({ htmlFor: 'myInput' }, 'Input'),
        t.input({ type: 'text', id: 'myInput' }),
      ),
    ),
  ),
  t.footer({ className: 'modal-footer' },
    t.button(
      { type: 'button', className: 'btn transparent', onclick: () => app.modals.close() },
      t.span({ className: 'txt' }, 'Close'),
    ),
    t.button(
      { 'html-form': 'myForm', type: 'submit', className: 'btn' },
      t.span({ className: 'txt' }, 'Save'),
    ),
  ),
)

app.modals.open(modal)
```

## Built-in components

```js
app.toasts.success('Saved')

const col = app.store.collections.find((c) => c.name === 'mail_campaigns')
app.modals.openRecordUpsert(col, recordId, {
  onsave: (record, isNew) => { /* refresh plugin store */ },
})
app.modals.openRecordUpsert(col, { name: '', vars: {} }) // new record

app.modals.openRecordsPicker(/* … */)
app.components.codeBlock(/* … */)
app.components.pageSidebar(/* … */)
```

**`openRecordUpsert(collection, recordOrDraft, options)`** (PB 0.39):

| Arg | Notes |
|-----|-------|
| `collection` | Object from `app.store.collections` — **not** a string |
| `recordOrDraft` | Record id string, draft object for new rows, or `null` |
| `options.onsave` | `(record, isNew) => void` after successful save |

Use this for Edit/New in plugins instead of hash links. See [examples.md §8](examples.md) and mailer `main.js`.

Inspect `app.modals` in DevTools for `onafterclose`, `ondelete`, etc.

## Collection extensions

### Custom field type

```js
app.fieldTypes.newFieldType = {
  icon: 'ri-link',
  label: 'New field ABC',
  settings: (store) => {},
  input: (store) => {},
  view: (store) => {},
}
```

### Collection settings tab

```js
app.collectionTypes.base.tabs['My tab'] = function (upsertData) {
  return t.div(null, 'Extra fields…')
}
```

### OAuth2 provider fields

```js
app.oauth2.google = function (providerInfo, namePrefix, data) {
  return t.div(null, 'Extra Google OAuth fields…')
}
```

## DOM mount hooks

Major UI regions emit lifecycle events. Find mount names via DevTools → `data-pb="name"` on elements.

```js
document.addEventListener('mount:appHeader', (e) => {
  e.detail.appendChild(
    t.img({ alt: 'Badge', src: '/_/extensions/example/badge.svg' }),
  )
})

document.addEventListener('unmount:appHeader', (e) => {
  // cleanup if needed
})
```

## Loading assets

```js
// Shablon
document.head.appendChild(
  t.link({ rel: 'stylesheet', href: '/_/extensions/example/style.css' }),
)

// Plain JS
import('/_/extensions/example/chunk.js') // dynamic import works in browser
```

## Styling conventions (v0.37+ admin UI)

The admin dashboard ships its own CSS (`/_/assets/index-*.css`). Extensions do **not** get Bootstrap/Tailwind.

**Three layers:**

1. **Built-in admin classes** — reuse layout/typography from the host UI: `page`, `page-content`, `page-header`, `grid`, `col-lg-6`, `label`, `txt-hint`, `txt-danger`, `flex-fill`, `m-b-base`, etc. Inspect the admin with DevTools to find names. Avoid guessing Bootstrap names (`card`, `label-success`) — they are not in the PB stylesheet.
2. **Extension CSS** — load from `/_/extensions/{name}/style.css`. Prefer PocketBase **CSS variables** so light/dark theme works: `var(--surfaceColor)`, `var(--surfaceAlt2Color)`, `var(--successTxtColor)`, `var(--accentColor)`, `var(--spacing)`, `var(--borderRadius)`, etc.
3. **Optional globals** — the admin page already loads **uPlot** (`/_/libs/uplot/`) and Remix Icon (`ri-*` classes) if you need charts/icons.

Minimal pattern:

```js
document.head.appendChild(t.link({ rel: 'stylesheet', href: '/_/extensions/my-plugin/style.css' }))

// my-plugin/style.css
.my-panel {
  border: 1px solid var(--surfaceAlt2Color);
  border-radius: var(--lgBorderRadius);
  background: var(--surfaceAlt1Color);
  padding: var(--spacing);
}
```

## Data access patterns

Prefer `app.pb` (inherits superuser auth from the admin session):

```js
const rows = await app.pb.collection('users').getList(1, 50, {
  filter: 'verified = true',
  sort: '-created',
})
```

`app.pb` has SDK auto-cancellation enabled by default. Duplicate in-flight requests to the same collection path cancel each other (e.g. two parallel `getList` calls on `instances`). Pass `{ $autoCancel: false }` when firing concurrent reads from one view, or serialize them. Ignore `ClientResponseError 0` / "autocancelled" in catch if you debounce realtime refreshes.

For custom server routes, use `app.pb.send()` (same as npm SDK).

## Navigate to native collection UI

To leave the plugin and open the built-in records table (not the upsert modal):

```js
function openCollectionRecords(collectionName, { filter, sort, recordId } = {}) {
  const col = app.store.collections.find((c) => c.name === collectionName)
  if (!col) return

  // Required — without this, #/collections defaults to collections[0] (often users)
  app.store.activeCollection = col

  const params = new URLSearchParams({ collectionId: col.id })
  if (sort) params.set('sort', sort)
  if (filter) params.set('filter', filter)
  if (recordId) params.set('recordId', recordId)

  window.location.hash = `#/collections?${params.toString()}`
}
```

**Wrong:** `#/collections/{id}/records/{recordId}` (path segments — router ignores, lands on wrong collection).

**Edit in modal:** use `openRecordUpsert` instead of hash navigation when you want the upsert overlay without leaving `#/mailer`.

## Realtime / SSE

Admin live data uses the SDK over **Server-Sent Events**:

```js
// Collection mirror
app.pb.collection('edges').subscribe('*', (e) => { /* e.record */ })

// Custom operator topic (server pushes from pb_hooks)
app.pb.realtime.subscribe('mothership/live/platform', (payload) => { /* … */ })
```

Full pattern (auth gate, `SubscriptionMessage`, incremental hooks, `$autoCancel`): [realtime-and-sse.md](realtime-and-sse.md).

## Shablon gotchas

| Gotcha | Fix |
|--------|-----|
| `onClick` does nothing | Use **`onclick`** |
| `oncreate` never runs | Imperative mount after render ([shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md)) |
| Sparklines/maps re-render too often | Narrow store ticks; update widget layer directly |
| Map tiles blocked | Check CSP `img-src` — mothership allows OSM, not Carto |
| Async fetch completes but UI stuck on "Loading…" | State must be `store({ … })`, not plain `{}`. Wrap dynamic children in `() => …` |
| Edit link opens wrong collection (e.g. users) | Use `app.modals.openRecordUpsert(col, id)` for edit modal, or set `app.store.activeCollection` before `#/collections?collectionId=…` |

## CSP

`/_/` routes get a default Content-Security-Policy from PocketBase. Inline scripts in `main.js` are served as `/_/extensions.js` (script endpoint). External scripts/styles must be allowed by CSP or loaded from extension static paths under `/_/extensions/{name}/`.

Typical admin `img-src` includes `https://tile.openstreetmap.org` only. Verify in DevTools → Network → response headers on `/_/` before using external map tile CDNs.

Details: [shablon-reactivity-and-dom.md](shablon-reactivity-and-dom.md#csp-on-_-routes).

## Stage 2 expectations

Maintainer notes ([#7612](https://github.com/pocketbase/pocketbase/discussions/7612)):

- Formal UI kit docs and stable extension API at v1.0-rc
- Possible breaking changes to `app.*` shape and registration helpers
- Go plugin pattern (`func Register(app core.App)`) for reusable backend+frontend packages

Build new extensions thinly so refactors are cheap.

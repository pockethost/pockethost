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

app.modals.openRecordUpsert(/* … */)
app.modals.openRecordsPicker(/* … */)
app.components.codeBlock(/* … */)
app.components.pageSidebar(/* … */)
```

Inspect `app.modals`, `app.components`, `app.toasts` in DevTools for signatures on your version.

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

## CSP

`/_/` routes get a default Content-Security-Policy from PocketBase. Inline scripts in `main.js` are served as `/_/extensions.js` (script endpoint). External scripts/styles must be allowed by CSP or loaded from extension static paths under `/_/extensions/{name}/`.

## Stage 2 expectations

Maintainer notes ([#7612](https://github.com/pocketbase/pocketbase/discussions/7612)):

- Formal UI kit docs and stable extension API at v1.0-rc
- Possible breaking changes to `app.*` shape and registration helpers
- Go plugin pattern (`func Register(app core.App)`) for reusable backend+frontend packages

Build new extensions thinly so refactors are cheap.

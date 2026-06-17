# Shablon reactivity, DOM, and third-party widgets

Lessons from mothership **Live** admin plugin (`pb_admin_ext/live/`). PocketBase admin uses **Shablon** (`t.*`) inside a hash-route SPA. Treat it like a lightweight reactive UI kit, not React.

## What works in `t.*` attrs

| Pattern | Status | Notes |
|---------|--------|-------|
| `className`, `id` | ✅ Reliable | Prefer `id` for imperative DOM lookup |
| `onclick`, `onsubmit` | ✅ | **Lowercase** — `onClick` is ignored |
| `innerHTML` (SVG snippets) | ✅ | Useful for sparklines; escape user data |
| `key` on list children | ✅ | Helps reconcile edge/collection rows |
| `() => …` child functions | ✅ | Re-run when parent store fields they read change |
| `data-*` custom attrs | ⚠️ Often dropped | Do not rely on `data-live-map` etc. |
| `oncreate` / `onupdate` / `onremove` | ❌ Not supported | Mithril-style hooks do **not** fire in PB admin Shablon |
| `ref` callbacks | ❌ Not observed | Use DOM queries after render |

**Rule:** for Leaflet, uPlot wrappers, canvas, or any widget that owns DOM — **mount imperatively** after Shablon renders.

## Reactive stores (`store()`)

```js
const data = store({ edges: [], chartTick: 0 })
const platform = store({ loading: true, chartTick: 0, edgeChartTick: 0 })
```

- Assigning `data.edges = …` or `platform.chartTick++` triggers re-render of route children that **read** those fields during render.
- Arrow child `() => t.div(…, data.edges.length)` re-evaluates when `data` changes.
- **Scope ticks narrowly.** Bumping `data.chartTick` on every edge heartbeat re-renders the whole `#/live` tree including map panels. Prefer `platform.edgeChartTick` read only by platform sparklines, not edge panels.
- Module-level state (`historyByEdgeId`, Leaflet map instances) is **not** reactive. Bump a tick field when Shablon must redraw SVG/sparklines, or update the third-party layer directly (preferred for maps).

## Imperative widget mount pattern (Leaflet)

Reference: `pb_admin_ext/live/main.js`.

1. **Load vendor JS/CSS at extension startup** (top of `main.js`), not on first mount:

```js
document.head.appendChild(t.link({ rel: 'stylesheet', href: '/_/extensions/live/vendor/leaflet.css' }))
;(() => {
  if (document.querySelector('script[data-live-leaflet]')) return
  const script = document.createElement('script')
  script.src = '/_/extensions/live/vendor/leaflet.js'
  script.defer = true
  script.dataset.liveLeaflet = '1'
  document.head.appendChild(script)
})()
```

2. **Shablon renders an empty host** with stable `id` + `className`:

```js
t.div({ id: `live-map-${edgeId}`, className: 'live-leaflet-host' })
```

3. **Track pending IDs** when rendering; **sync after microtask / interval / hashchange**:

```js
const pending = new Set()
function track(id) { pending.add(id); scheduleSync() }

function scheduleSync() {
  queueMicrotask(() => {
    for (const id of pending) {
      const el = document.getElementById(`live-map-${id}`)
      if (el) mountMap(id, el)
    }
    // Fallback if `id` stripped: match `.live-leaflet-host` order to pending Set order
  })
}
```

4. **Update the widget directly** on animation/timer (circle markers), not via Shablon re-render every frame.
5. **Save/restore** map `center`/`zoom` in module state if parent panels still remount on unrelated ticks.
6. Call `map.invalidateSize()` after layout changes and on a short interval while `#/your-route` is active.

## DOM mount hooks (built-in admin chrome only)

For **header/sidebar** injection, PocketBase emits `mount:*` / `unmount:*` events (see [client-api.md](client-api.md)). These are for **host UI regions**, not custom route content. Do not use them for plugin page widgets.

## CSP on `/_/` routes

Admin responses include a strict CSP. Typical mothership header:

```
default-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' http://127.0.0.1:* https://tile.openstreetmap.org data: blob:;
connect-src 'self' http://127.0.0.1:* https://nominatim.openstreetmap.org;
script-src 'self' http://127.0.0.1:*;
```

| Need | Allowed approach |
|------|------------------|
| Extension JS/CSS | `/_/extensions/{name}/…` (`script-src 'self'`) |
| Map tiles | **OpenStreetMap** `tile.openstreetmap.org` is whitelisted |
| Carto / Mapbox / other CDNs | **Blocked** unless PocketBase CSP changes — use OSM or self-hosted tiles |
| Dynamic `import()` / extra scripts | Same-origin under `/_/extensions/` |

If tiles never appear in Network tab, check **img-src** first, then confirm Leaflet JS loaded.

Dark basemap without Carto: CSS `filter` on `.leaflet-tile-pane` (see Live plugin styles).

## Styling third-party widgets

- Scope under a host class (`.live-leaflet-host .leaflet-container`) so Leaflet controls inherit admin theme vars.
- Set explicit host **height** (e.g. `240px`); Leaflet renders blank if container is 0px.
- Reuse PB CSS variables: `--surfaceColor`, `--accentColor`, `--bodyColor`, etc.

## Debugging checklist

1. Hard refresh admin (`Ctrl+Shift+R`) after `main.js` edits — served via `/_/extensions.js`.
2. Network: `extensions.js`, `/_/extensions/{name}/vendor/*.js`, then tile PNGs.
3. Console: mount errors; CSP violations show as blocked img/script.
4. Elements: host div exists with expected `id` / class; child `.leaflet-container` appears after mount.
5. `console.log(app)` for live API shape on your PB version.

## Anti-patterns

- Assuming `oncreate` will init maps/charts.
- Bumping a global route tick 20fps for animation — update imperative layer instead.
- Carto/Mapbox tile URLs without verifying CSP.
- Loading Leaflet only inside a mount path that never runs.

# Admin Plugins on PocketHost

## Where plugins run

| App | PB version | Admin plugins | Notes |
|-----|------------|---------------|-------|
| **Mothership** | 0.39.\* | Yes | Operator tooling, internal dashboards |
| **Customer instances** | User-selected semver | Only if **≥0.37** | Deployed via phio/FTP with hooks |

## Mothership layout

```
packages/pockethost/src/mothership-app/
  pb_hooks/                    ← tsdown output (generated)
    mothership.pb.js
  pb_admin_ext/                ← static extension trees (hand-maintained)
    operator-stats/
      main.js
  src/lib/handlers/
    adminPlugins/hooks.ts      ← $app.onServe uiExtensions registration
```

Registration hook is bundled by tsdown. Static assets under `pb_admin_ext/` are copied/deployed as plain files.

### Dev workflow

1. `pnpm dev:mothership-hooks` — watch tsdown when editing registration hook.
2. Edit `pb_admin_ext/*/main.js` — refresh admin UI to pick up `/_/extensions.js` (main.js changes often hot-refresh).
3. Mothership admin URL: local `serve` stack → mothership subdomain (see MEMORY.md dev workflow).
4. Superuser auth: `_superusers` collection (v0.39).

### Deploy

Production mothership PM2 app serves from the deployed `mothership-app/` tree. Ensure `pb_admin_ext/` ships with `pb_hooks/` on every deploy. Hook bundle swaps require mothership stop/reload per `.cursor/rules/mothership-hooks.mdc`.

## Customer instances

- phio/FTP deploy uploads instance `pb_hooks/` and sibling dirs.
- Container restart loads hooks atomically.
- Document minimum PB **0.37** if your product relies on admin plugins.
- Do not assume all instances are on 0.39 — check `PH_ALLOWED_POCKETBASE_SEMVER` and per-instance version.

## Backlog alignment

**Mothership operator stats (post-v0.39)** — rebuild subscriber/growth reporting with:

1. PocketBase **view collections** (replaces legacy SQL views that blocked v0.39 migrator)
2. Admin plugin page(s) under `pb_admin_ext/operator-stats/` for charts/tables

Legacy SQL views (`stats`, `verified_users`, …) were restored temporarily via `1781606400_restored_sql_views.js` but long-term direction is view collections + admin UI, not raw SQL views.

## Firewall / routing

Admin UI is served by PocketBase on the instance/mothership origin. No PocketHost firewall changes needed for `/_/extensions/*` — same host as `/_/` admin routes.

## Testing checklist

- [ ] `GET /_/extensions.js` returns JS after superuser login context (or anonymously if route is public — verify behavior on your version)
- [ ] Header link appears when superuser is authenticated
- [ ] `app.pb.collection(...)` calls succeed with superuser rules
- [ ] Extension works on target PB version (0.37 vs 0.39 — spot-check `app` shape in console)

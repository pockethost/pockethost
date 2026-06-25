# PocketBase v0.23+ JSVM upgrade (mothership port)

**Canonical reference:** [Upgrade to v0.23.0 (JSVM)](https://pocketbase.io/v023upgrade/jsvm/)

v0.39 uses the same post-v0.23 JSVM. Do not mix ≤ v0.22 and ≥ v0.23 APIs in one app.

## PocketHost mothership port checklist

1. Bump `MOTHERSHIP_SEMVER` to `0.39.*` in `packages/pockethost/src/constants.ts`.
2. Regenerate `mothership-app/src/types/types.d.ts` from PB 0.39 `pb_data/types.d.ts`.
3. Port all TS under `mothership-app/src/lib/handlers/` → rebuild with `pnpm --filter pockethost-mothership-app build`.
4. Verify CI: `pnpm check:mothership-hooks`.
5. Replace `pb_migrations/` with v0.39 snapshot: `./pocketbase migrate collections` (or `pockethost mothership schema`).
6. Bump npm `pocketbase` SDK; replace `client.admins` with `collection('_superusers').authWithPassword`.
7. Do **not** widen `PH_ALLOWED_POCKETBASE_SEMVER` in the mothership-only PR.

**Pre-stage on 0.22 (already on `main`):** legacy SQL views dropped via `1781606600_dropped_sql_views` — no cutover-day `sqlite3` preupgrade step. Dual admin auth in `packages/pockethost/src/common/adminAuth.ts`.

## Port order

1. bootstrap + meta settings
2. mirror (`POST /api/mirror`, `resetInstancesIdle`)
3. instance CRUD + model hooks
4. lemon, signup, user token
5. mail, sns, notify, stats, outpost, versions

## Mechanical mapping

| ≤ v0.22 | ≥ v0.23 |
|---------|---------|
| `$app.dao().findRecordById(...)` | `$app.findRecordById(...)` |
| `$app.dao().saveRecord(r)` | `$app.save(r)` |
| `$app.dao().findRecordsByFilter(...)` | `$app.findRecordsByFilter(...)` |
| `$app.dao().findRecordsByExpr(...)` | `$app.findAllRecords(...)` |
| `(c: echo.Context)` | request event `(e)` |
| `c.pathParam('id')` | `e.request.pathValue('id')` |
| `'/api/foo/:id'` | `'/api/foo/{id}'` |
| `$apis.requestInfo(c).data` | `e.requestInfo().body` or **`e.bindBody(DynamicModel)`** (preferred for typed JSON) |
| `$apis.requireAdminAuth()` | `$apis.requireSuperuserAuth()` |
| `$apis.requireRecordAuth()` | `$apis.requireAuth()` |
| `onAfterBootstrap` | `onBootstrap` + `e.next()` before work |
| `onModelBeforeCreate` | `onRecordCreate` + `e.next()` |
| `onModelBeforeUpdate` | `onRecordUpdate` + `e.next()` |
| `onRecordBeforeCreateRequest` | `onRecordCreateRequest` + `e.next()` |
| `onRecordBeforeUpdateRequest` | `onRecordUpdateRequest` + `e.next()` |
| `onModelAfterCreate` | `onRecordAfterCreateSuccess` + `e.next()` |
| `RecordUpsertForm.submit()` | `record.set(...)` + `$app.save(record)` |
| `SettingsUpsertForm` | `$app.settings()` + mutate + `$app.save(settings)` |
| `record.getId()` | `record.id` |
| `record.originalCopy()` | `record.original()` |
| `_admins` / `client.admins` | `_superusers` collection auth |

## Repo before/after

**v22 instance admin sync** (`instance-app/v22/pb_hooks/_ph_admin_sync.pb.js`):

```js
onAfterBootstrap((e) => {
  // insert into _admins ...
})
```

**v23 instance admin sync** (`instance-app/v23/pb_hooks/_ph_admin_sync.pb.js`):

```js
onBootstrap((e) => {
  e.next()
  // insert into _superusers (password not passwordHash)
})
```

## Migration CLI

```bash
# Fresh collection snapshot (after v0.39 data.db auto-upgrade)
./pocketbase migrate collections --dir /path/to/pb_data --migrationsDir /path/to/pb_migrations

# Optional: sync migration history after replacing migration files
./pocketbase migrate history-sync
```

PocketHost wrapper: `pnpm prod:cli mothership schema` (uses `MOTHERSHIP_SEMVER`).

## High-risk mothership files

- `meta/boot/HandleMetaUpdateAtBoot.ts` — no `SettingsUpsertForm`
- `instance/api/HandleInstanceCreate.ts`, `HandleInstanceUpdate.ts` — no `RecordUpsertForm`
- `lemon/api/HandleLemonSqueezySale.ts` — `requestInfo().body`
- `user/api/HandleUserTokenRequest.ts` — read `password:hash` not `passwordHash` or `password` (admin sync)
- `$http.send` — set `Content-Type: application/json` explicitly when posting JSON

## Hooks that must call `e.next()`

All v0.23+ interceptors: bootstrap, record hooks, router middleware. Missing `e.next()` blocks the chain.

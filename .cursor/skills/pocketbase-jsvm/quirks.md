# Goja / JSVM quirks

Behavioral gotchas in PocketBase's embedded **Goja** runtime. Not obvious from Node or browser JS. Shared across PocketBase versions (API names differ at v0.23 — see [SKILL.md](SKILL.md)).

Environment limits (no async, no Node APIs): [constraints.md](constraints.md). Request bodies: [request-body.md](request-body.md).

## Quick reference

| Symptom | Likely quirk | Fix |
|---------|--------------|-----|
| Client sees "Something went wrong with your request." | Plain `throw new Error(...)` or `ReferenceError` in a hook | Use `BadRequestError` for intentional messages. Fix the underlying throw. Check mothership logs. |
| Admin save returns OK but field unchanged | `onRecordUpdate` / `*Request` hook returned without `e.next()` | Call `e.next()` on **every** code path (including early `return`). Missing `e.next()` aborts the finalizer silently — no error. |
| `Invalid IP or CIDR: "91"` from valid JSON array | `record.get('jsonField')` returned **byte array** of serialized JSON | `JSON.parse(toString(raw))` |
| `Each trusted IP must be a string` with valid JSON | `DynamicModel` / `JSONArray` elements are not `typeof 'string'` | Coerce with `` `${entry}` `` before validating |
| Destructuring / `$common` validators see wrong shape after `bindBody` | DynamicModel props are Go-backed until round-tripped | `data = JSON.parse(JSON.stringify(data))` after `e.bindBody(data)` |
| `ReferenceError: helper is not defined` in record hook | **No function hoisting** in `mothership.pb.js` routers | `require(\`${__hooks}/mothership\`)` inside the callback |
| JSON field reads wrong inside `onRecordUpdate` | `$app.save()` runs record hooks in the same request | Use `readTrustedIpsFromRecord` / `toString` coercion in hook-layer code |

---

## 1. `toString(val)` — Go values to JS strings

PocketBase provides a global **`toString(val)`**. It is **not** the same as `String(val)` or template coercion in all cases.

```js
toString(e.request.body)              // body stream → string
toString([104, 101, 108, 108, 111]) // byte slice → "hello"
```

### JSON record fields

`record.get('myJsonField')` on a `json` column can return:

- A plain JS array/object (sometimes, after load from DB)
- A **byte array** of the JSON text (common immediately after `record.set()`)

Example: setting `trusted_ips` to `["192.168.1.1/32"]` then reading back can yield:

```js
[91, 34, 49, 57, 50, 46, 49, 54, 56, 46, 49, 46, 49, 47, 51, 50, 34, 93]
// ASCII for ["192.168.1.1/32"]
```

Iterating that as an IP list produces nonsense like `"91"`. Fix:

```js
const raw = record.get('trusted_ips')
if (raw == null) return null

const roundTripped = JSON.parse(JSON.stringify(raw))
if (Array.isArray(roundTripped) && roundTripped.length > 0 && typeof roundTripped[0] === 'string') {
  return roundTripped
}
if (Array.isArray(roundTripped) && roundTripped.length === 0) {
  return roundTripped
}

return JSON.parse(toString(raw))
```

Alternatives: `record.unmarshalJSONField(key, dst)` with a `DynamicModel` shape.

**Hook-layer only.** Do not call `toString()` from `$common/` modules bundled into hooks — it is a PocketBase global, not Node.

PocketHost: `readTrustedIpsFromRecord` in `handlers/user/model/trustedIps.ts`. Pattern also used in `HandleStatsRequest` for `$os.readFile()`.

---

## 2. No function hoisting in hook router files

In `mothership.pb.js` (and other `*.pb.js` side-effect routers), **do not** define helpers with `function name() {}` **below** `onRecordUpdate` / `routerAdd` and call them from above.

Goja does **not** reliably hoist function declarations. At runtime the callback throws:

```text
ReferenceError: readHelper is not defined
```

PocketBase converts that to the generic client message **"Something went wrong with your request."**

```js
// WRONG — helper below the hook (no hoisting in Goja)
onRecordUpdate((e) => {
  readHelper(e.record)
}, 'users')
function readHelper(record) { ... }

// WRONG — early return without e.next() (save silently skipped)
onRecordUpdate((e) => {
  const record = e.record
  if (!record) return
  if (!fieldChanged(record)) return
  require(`${__hooks}/mothership`).validateSomething(record)
}, 'users')

// RIGHT — custom route owns field validation; thin router only
routerAdd('PATCH', '/api/user/trusted-ips', (e) => {
  return require(`${__hooks}/mothership`).HandleUserTrustedIpsUpdate(e)
}, $apis.requireAuth())

// RIGHT — record hook: handler work, then e.next() on every path
onRecordUpdate((e) => {
  require(`${__hooks}/mothership`).BeforeUpdate_version(e)
  e.next()
}, 'instances')
```

Prefer logic in `mothership.js` exports; keep `*.pb.js` as thin `routerAdd` / `onRecord*` wiring. Do not re-validate a field in `onRecordUpdate` when a custom route already validated and saved it.

### `e.next()` on every path

v0.23+ hooks are a middleware chain. If a handler **returns without calling `e.next()`**, PocketBase skips the finalizer (the actual DB write). The client often still gets **200 OK** — the change simply never persists.

```js
// WRONG
onRecordUpdate((e) => {
  if (!shouldRun(e.record)) return
  e.next()
}, 'users')

// RIGHT
onRecordUpdate((e) => {
  if (shouldRun(e.record)) {
    require(`${__hooks}/mothership`).doWork(e)
  }
  e.next()
}, 'users')
```

Or keep validation in a dedicated API handler and omit the `onRecordUpdate` hook entirely (PocketHost: `trusted_ips` → `PATCH /api/user/trusted-ips` only).

---

## 3. `bindBody` + `DynamicModel` round-trip

After `e.bindBody(data)`, fields on `data` are Go-backed. Before destructuring or passing to `$common` validators:

```js
let data = new DynamicModel({ trusted_ips: [] })
e.bindBody(data)
data = JSON.parse(JSON.stringify(data))
```

See [request-body.md](request-body.md).

### Array elements are not JS strings

Even after round-trip, JSONArray entries may fail `typeof entry === 'string'`. Coerce:

```js
const text = entry == null ? '' : `${entry}`.trim()
```

---

## 4. Client-visible errors — `BadRequestError` only

PocketBase **sanitizes** plain `throw new Error(...)` in custom routes and many hooks to:

```text
Something went wrong with your request.
```

Only `ApiError` subclasses reach the client (`BadRequestError`, `UnauthorizedError`, …).

When `$common` throws plain `Error`:

```js
try {
  return validateSomething(raw)
} catch (error) {
  throw new BadRequestError(error instanceof Error ? error.message : `${error}`)
}
```

Use `error.message`, not `` `${error}` ``, to avoid a leading `Error: ` prefix in the JSON response.

Dashboard `parseError()` reads `ClientResponseError.data.message` when no field validation map is present.

---

## 5. Record hooks run during `$app.save()`

A custom route that calls `$app.save(record)` **also** runs matching `onRecordUpdate` / `onRecordCreate` hooks in the same request.

Plan for:

- Shared read helpers (`readTrustedIpsFromRecord`) using `toString` where needed
- Validate and normalize in the **custom route** that owns the field (`HandleUserTrustedIpsUpdate`), not a duplicate `onRecordUpdate` guard
- Every `onRecordUpdate` hook must call `e.next()` on all paths (see §2)
- Hook router helpers reachable via `require()` (hoisting quirk above)

---

## 6. Debugging checklist

When a hook "doesn't work" and the client only shows the generic message:

1. Read **mothership / instance logs** — the real error is there (`ReferenceError`, validation text, etc.).
2. If the client got 200 but data did not change, check for **`return` without `e.next()`** in `onRecordUpdate` / `*Request` hooks.
3. Log `JSON.stringify(value)` and `typeof value` after `record.get()` on json fields.
4. Confirm hook bundle is rebuilt (`pnpm --filter pockethost-mothership-app build`) and hot-reload picked up a consistent tree.
5. Re-check [request-body.md](request-body.md) if the issue is PATCH/POST payload shape.

---

## PocketHost examples (this repo)

| Quirk | File |
|-------|------|
| `toString` + json field read | `mothership-app/src/lib/handlers/user/model/trustedIps.ts` |
| `bindBody` + round-trip | same; `HandleMailSend`, `HandleInstanceUpdate` |
| `BadRequestError` wrap | `validateSshKey.ts`, `trustedIps.ts` |
| Thin hook routers (no `onRecordUpdate` for trusted IPs) | `mothership-app/src/lib/handlers/user/hooks.ts` |
| `$os.readFile` coercion | `handlers/stats/api/HandleStatsRequest.ts` |

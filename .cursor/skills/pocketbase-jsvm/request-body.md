# Reading request bodies (≥ v0.23 custom routes)

Official reference: [JS Routing — Reading request body](https://pocketbase.io/docs/js-routing/#reading-request-body)

PocketBase parses JSON, form, and XML bodies before your route handler runs. Prefer the built-in parsers over manual `JSON.parse` on the raw stream.

## Decision tree

| Situation | Use |
|-----------|-----|
| Typed JSON body from `pb.send()` / dashboard client | **`e.bindBody()` + `DynamicModel`** (PocketHost mothership default) |
| Quick one-off field read, no schema | `e.requestInfo().body` |
| Webhook signature / raw bytes must match upstream exactly | `readerToString(e.request.body)` then verify + parse |
| Debug only | `toString(e.request.body)` |

Do **not** default to `JSON.parse(readerToString(e.request.body))` for app JSON APIs. It bypasses PocketBase's unmarshaller, breaks on edge cases (empty body, wrong content-type), and mishandles nested/array fields compared to `bindBody`.

Goja json fields, array coercion, hoisting, and error sanitization: [quirks.md](quirks.md).

## Preferred: `bindBody` + `DynamicModel`

```js
routerAdd('PATCH', '/api/user/trusted-ips', (e) => {
  let data = new DynamicModel({
    trusted_ips: [], // JSON array — use [] not null unless field is optional via nullArray()
  })

  e.bindBody(data)

  // Required in Goja: DynamicModel props are not plain JS values until round-tripped
  data = JSON.parse(JSON.stringify(data))

  const normalized = validateTrustedIpListForSubscription(data.trusted_ips, subscription)
  return e.json(200, { trusted_ips: normalized })
}, $apis.requireAuth())
```

### DynamicModel rules (from PB typings)

- Field access is **lowerCamelCase** in JS even when JSON keys are snake_case (`trusted_ips` in JSON → `data.trusted_ips`).
- Arrays: initialize with `[]` (or `nullArray()` when the field may be omitted/null).
- Objects: initialize with `{}` (or `nullObject()`). Nested objects are `types.JSONMap` — use `.get(key)` / `.set(key, value)` **before** the JSON round-trip if you skip it.
- Float `0`: use `-0` in the shape if you need to distinguish from unset.
- After `bindBody`, mothership handlers **always** `JSON.parse(JSON.stringify(data))` before destructuring or passing values to `$common` validators. See `HandleMailSend`, `HandleInstanceUpdate`.

### Nested shapes

```js
let data = new DynamicModel({
  id: '',
  fields: {
    subdomain: null,
    power: null,
    webhooks: null,
  },
})
e.bindBody(data)
data = JSON.parse(JSON.stringify(data))
```

Use `null` in the shape for optional nullable scalars (matches instance update handlers).

## Alternative: `requestInfo().body`

```js
const body = e.requestInfo().body
if (!('trusted_ips' in body)) {
  throw new BadRequestError('trusted_ips is required')
}
```

Good for small handlers. Values are already parsed (including arrays). Still validate/normalize before `$app.save`.

v0.22 equivalent was `$apis.requestInfo(c).data` — see [v023-upgrade.md](v023-upgrade.md).

## Raw body (webhooks only)

Use when the **exact** byte sequence matters (HMAC, SNS, Lemon Squeezy):

```js
const raw = readerToString(e.request.body)
// verify signature against raw, then JSON.parse(raw)
```

Examples in mothership: `HandleLemonSqueezySale`, `HandleSesError`, `HandleSignupConfirm`.

## Client side (`pb.send`)

The JS SDK sends JSON when `body` is a plain object:

```ts
await pb.send('/api/user/trusted-ips', {
  method: 'PATCH',
  body: { trusted_ips: ['203.0.113.5/32'] },
})
```

Auth headers attach automatically when `authStore` is valid. See **pocketbase-js-sdk**.

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| `trusted_ips must be an array` after save | Body read via raw parse; field missing or wrong type — use `bindBody` with `trusted_ips: []` |
| `Each trusted IP must be a string` with valid JSON | Goja array elements — see [quirks.md § bindBody](quirks.md#3-bindbody--dynamicmodel-round-trip) |
| `"91"` / byte array after `record.set` on JSON field | `record.get()` byte slice — see [quirks.md § toString](quirks.md#1-tostringval--go-values-to-js-strings) |
| `Something went wrong with your request` | Plain `Error` or `ReferenceError` — see [quirks.md § BadRequestError](quirks.md#4-client-visible-errors--badrequesterror-only) |
| `Invalid JSON body` | Empty body or non-JSON content-type on a route expecting JSON |
| Destructuring / validator sees wrong shape | Skipped `JSON.parse(JSON.stringify(data))` after `bindBody` |
| Field always empty | Wrong DynamicModel key casing (use lowerCamelCase) |

## Client-visible errors (`BadRequestError`)

PocketBase **sanitizes plain `throw new Error(...)`** in custom routes to a generic message (`Something went wrong with your request.`) outside `--dev`. Only `ApiError` subclasses reach the client.

When `$common` helpers throw plain `Error` (validation, normalization), wrap at the hook boundary:

```js
try {
  return validateTrustedIpListForSubscription(raw, subscription)
} catch (error) {
  throw new BadRequestError(`${error}`)
}
```

Pattern: `validateSshKey.ts`, `HandleUserTrustedIpsUpdate`. Dashboard `parseError()` reads `ClientResponseError.data.message` when no field-level validation map is present.

Do **not** rely on `--dev` for user-facing copy. Always use `BadRequestError` / `UnauthorizedError` / etc. for intentional client messages. Full quirk write-up: [quirks.md § 4](quirks.md#4-client-visible-errors--badrequesterror-only).

## PocketHost references

- `HandleMailSend` — minimal bindBody
- `HandleInstanceUpdate` — nested `DynamicModel` + bindBody
- `HandleUserTrustedIpsUpdate` — should use bindBody (not raw `readerToString`) for JSON client payloads

# JSVM runtime reference (Goja + PocketBase)

Quick reference for what actually runs inside PocketBase hooks. Use when unsure whether an API or npm package is safe to import into mothership-app.

## What PocketBase is

From [Extend with JavaScript — Overview](https://pocketbase.io/docs/js-overview/):

- Embedded **Goja** engine (ES5.1+, much of ES6+).
- **Not** Node.js, **not** a browser (`window`, `fetch`, DOM unavailable).
- **CommonJS only** for hooks: `require()` / `module.exports`.
- TypeScript in repo is **transpiled/bundled** (tsdown) to `.js` before PocketBase loads it.
- ESM npm packages need pre-bundling; even then, deps must not assume Node.

## PocketBase globals (prefer these)

Browse [PocketBase JSVM reference](https://pocketbase.io/jsvm/) and `mothership-app/src/types/types.d.ts`.

| Global | Use for |
|--------|---------|
| `$app` | Records, DAO, DB queries, saves |
| `$apis` | Auth middleware, request info |
| `$http.send()` | Outbound HTTP (**synchronous**) |
| `$os` | Env (`getenv`), shell, file ops where allowed |
| `$security` | JWT, random strings, crypto helpers |
| `$filesystem`, `$filepath` | File paths in PB filesystem |
| `$mails` | Mailer |
| `__hooks` | Absolute path to `pb_hooks/` |
| `process.env` | Env shim only (not full Node `process`) |

Go standard library is exposed under **namespaces** in the JSVM reference (`net`, `os`, `http`, …) — these are **Go bindings**, not Node modules. Do not assume `require("node:net")` works because a `net` namespace exists in the typings.

## Goja / engine limits

From [goja README](https://github.com/dop251/goja):

- No `setTimeout` / `setInterval` (host controls concurrency; PocketBase uses a hooks pool).
- Single goroutine per runtime — no concurrent JS inside one handler.
- Go wrapper types (maps/slices from `$app`) may not behave like native JS objects.
- WeakRef / FinalizationRegistry not available.
- Performance: fine for orchestration; heavy crypto/loops should use Go bindings (`$security`, etc.).

## goja_nodejs (partial Node `require`)

PocketBase enables [goja_nodejs](https://github.com/dop251/goja_nodejs) for **some** core modules. Modules are **opt-in per runtime**; unregistered modules throw:

```text
GoError: No such built-in module
```

Implemented modules (see goja_nodejs repo — grows over time): typically **`console`**, **`buffer`**, **`url`**, **`util`**, **`process`** (env subset). **`node:net`**, **`node:fs`**, **`node:path`**, **`node:crypto`** are **not** available unless PocketBase explicitly registers them (they generally are **not**).

**Do not** rely on goja_nodejs for new mothership code. Use PocketBase globals.

## npm packages in hook bundles

tsdown can inline npm deps into `mothership.js`. Many assume Node or `fetch`. Before adding a dependency to mothership-app:

1. Read its entry for Node built-ins.
2. Build and inspect output size and top-level `require()` calls.
3. Prefer vendoring a 10-line pure function over importing a package.

`ajv`, `node:net`, etc. have appeared in mothership bundles via `$common` — treat as incidents, not patterns.

## Optional: vendor upstream for inspection

To see exactly which modules PocketBase registers, clone upstream next to the repo (optional; not required for day-to-day work):

```bash
mkdir -p vendor && cd vendor
git clone --depth 1 https://github.com/pocketbase/pocketbase.git
git clone --depth 1 https://github.com/dop251/goja.git
git clone --depth 1 https://github.com/dop251/goja_nodejs.git
```

Search PocketBase for `goja_nodejs`, `RegisterCoreModule`, and hook pool setup. Search goja_nodejs for `RegisterCoreModule` / `builtin` map to list shims.

Submodules are optional; document findings in PRs when you discover new constraints.

## pocketbase-node npm package

The skill mentions [pocketbase-node](https://www.npmjs.com/package/pocketbase-node) as a Node-compat subset for JSVM. PocketHost mothership code should still prefer **`$app` / `$http`** first; only reach for pocketbase-node if PocketBase docs explicitly recommend it for a gap.

## Further reading in this repo

- `packages/dashboard/src/routes/(static)/docs/js/+page.md` — user-facing JSVM docs
- `.cursor/skills/pocketbase-jsvm/pockethost-boundary.md` — PocketHost Node vs JSVM split
- `.cursor/skills/pocketbase-jsvm/constraints.md` — concise do/don't list

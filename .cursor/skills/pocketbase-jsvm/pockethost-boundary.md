# PocketHost: Node vs JSVM boundary

PocketHost runs **two different JavaScript runtimes** under `packages/pockethost/`. Treating them as one codebase causes production crashes (e.g. `GoError: No such built-in module` when PocketBase loads hooks).

## Runtimes

| Runtime | Where | Bundled? | Safe APIs |
|---------|-------|----------|-----------|
| **Node.js** | `src/cli/`, `src/services/`, `src/common/`, dashboard | tsx / Vite | `node:*`, npm packages, `async`/`await`, `fs`, Express, Docker SDK |
| **PocketBase JSVM (Goja)** | `mothership-app/src/`, `instance-app/*/pb_hooks/` | tsdown → `pb_hooks/*.js` | `$app`, `$apis`, `$http`, `$os`, `$security`, local `require()`, `process.env` shim |

Official PocketBase docs:

- [JS overview](https://pocketbase.io/docs/js-overview/) — what the engine is and is not
- [JSVM API reference](https://pocketbase.io/jsvm/) — globals and Go-backed namespaces exposed to hooks

Engine background: [goja](https://github.com/dop251/goja) (ES5.1+ interpreter in Go). PocketBase adds a **partial** [goja_nodejs](https://github.com/dop251/goja_nodejs) `require()` registry — **not** full Node.

## Hard rule: `src/common/` is Node-only

**Do not import `packages/pockethost/src/common/` from mothership-app.**

The `$common` tsconfig alias (`mothership-app/tsconfig.json`) exists historically but is **unsafe**: `common/` re-exports Node-oriented modules (`ioc`, `mkSingleton`, schema types wired to `ajv`, etc.). tsdown bundles transitive imports into `pb_hooks/mothership.js`, which PocketBase evaluates at startup — any top-level `require("node:…")` kills the process before `/api/health` responds.

### Forbidden in mothership-app source

```ts
// WRONG — pulls Node-only code into the hook bundle
import { validateFirewallAccessFields } from '$common'
import { isIPv4 } from 'node:net'
import fs from 'node:fs'
import { mkSingleton } from '../common/ioc'
```

### Allowed patterns

1. **JSVM-safe helpers** under `mothership-app/src/lib/util/` (pure functions, `$http`, `$app` only).
2. **JSVM-safe domain types/constants** colocated in `mothership-app/src/lib/` (duplicate small enums/constants rather than importing `common/schema`).
3. **Node-only logic** stays in `src/common/` or `src/cli/` and runs in CLI/services — never in hooks.

When firewall, dashboard, and mothership need the same *shape* of data (e.g. trusted IP JSON), define:

- **Node side**: validation in `src/common/` or firewall code (`node:net`, `ip-cidr`, etc.)
- **JSVM side**: parallel pure-JS validation in `mothership-app/src/lib/` (regex / string checks, no Node built-ins)

Keep field names and limits in sync manually or via shared **JSON schema docs**, not shared TypeScript modules that drag Node deps.

## Mothership build pipeline

```
mothership-app/src/lib/handlers/*.ts   ─┐
mothership-app/src/lib/index.ts        ─┼─ tsdown ─► pb_hooks/mothership.js  (loaded by PocketBase)
mothership-app/src/hooks/index.ts      ─┘           pb_hooks/mothership.pb.js (hook entry routers)
```

Config: `mothership-app/tsdown.config.ts` — bundles with `skipNodeModulesBundle: false`, so **any** Node API in the graph ends up in output.

After handler changes:

```bash
cd packages/pockethost/src/mothership-app && pnpm build
```

### Pre-merge bundle audit (required)

From repo root:

```bash
rg 'require\("node:' packages/pockethost/src/mothership-app/pb_hooks/mothership.js
rg 'require\("fs"\)|require\("path"\)|require\("crypto"\)' packages/pockethost/src/mothership-app/pb_hooks/mothership.js
```

Both must return **no matches**. If they do, trace the import back to a forbidden `$common` or npm dependency and move logic into JSVM-safe code.

## Symptom → cause

| Log | Likely cause |
|-----|----------------|
| `GoError: No such built-in module` | `require("node:…")` or unsupported npm module at **module load** time |
| Endless `ECONNRESET` on `/api/health` | PocketBase exited during hook load; health check retries against a dead process |
| `Pocketbase exited with code 1` right after SQL on `_params` | Hook evaluation failed mid-bootstrap |

**Case study (2026-06):** `RateLimits.ts` in `common/schema` imported `node:net`. `HandleInstanceUpdate.ts` imported via `$common` → tsdown emitted `require("node:net")` at line 27 of `mothership.js` → mothership never started.

## Handler isolation (PocketBase)

Per [JS overview — handler scope](https://pocketbase.io/docs/js-overview/#handlers-scope): each hook runs in an isolated context. Shared code must be `require()`'d from `${__hooks}/…` modules (see `mothership.pb.js` pattern). Do not rely on module-level closures across handlers.

## Agent checklist

Before editing mothership handlers or adding shared validation/types:

- [ ] Will this file (or its imports) ever be bundled into `pb_hooks/`?
- [ ] If yes, is every dependency JSVM-safe (no `node:*`, no Node-only npm)?
- [ ] Did I avoid `$common` and `../common/` entirely?
- [ ] After build, did `rg 'require\("node:' pb_hooks/mothership.js` pass?
- [ ] For duplicated limits/enums, did I note both sides in the PR (Node + JSVM)?

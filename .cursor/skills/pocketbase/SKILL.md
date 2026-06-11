---
name: pocketbase
description: >-
  Models PocketBase backends: collections, relations, auth, API rules, migrations,
  and architecture. Use when designing schema, security rules, data modeling,
  choosing between hooks vs client access, or explaining PocketBase platform
  concepts — not for npm JS SDK code or pb_hooks.
---

# PocketBase Platform

PocketBase is a single-binary backend: SQLite database, REST + realtime API, auth, file storage, and admin UI.

Official docs: https://pocketbase.io/docs/

## Which skill to use

| Task | Skill |
|------|-------|
| Design collections, rules, auth | **pocketbase** (this skill) |
| Browser/Node app calling PocketBase over HTTP | **pocketbase-js-sdk** |
| Server-side hooks in `pb_hooks/*.pb.js` | **pocketbase-jsvm** |

## Core concepts

### Collections and records

- **Collections** are tables; **records** are rows.
- Field types: text, number, bool, email, url, date, select, relation, file, json, etc.
- **Relations** link collections; use expand in API queries to include related records.
- **Indexes** improve filter/sort performance on large collections.

### Auth

- **Auth collections** (e.g. `users`) support registration, login, OAuth2, OTP.
- **Superusers** are admin accounts (`_superusers`); regular auth records live in auth collections.
- JWT tokens identify authenticated requests; API rules reference `@request.auth`.

### API rules (security)

Rules control list/view/create/update/delete per collection. Write rules as filter expressions:

```
@request.auth.id != "" && @request.auth.id = user.id
```

- Prefer **API rules** over middleware for access control.
- `@request.auth` — current authenticated record (or null).
- `@collection.*` — cross-collection lookups in rules.
- Empty rule = locked; `@request.auth.id != ""` = any authenticated user.

### Migrations

Two migration systems:

| Type | Location | Language | Use for |
|------|----------|----------|---------|
| Go migrations | `pb_migrations/` | Go (compiled into binary) | Core schema shipped with PocketBase |
| JS migrations | `pb_migrations/*.js` | JSVM (sync) | User/instance schema changes via FTP |

JS migrations run in the JSVM — see **pocketbase-jsvm** for constraints.

### Realtime

- Clients subscribe to collection or record changes via the SDK.
- Subscription access is governed by the same API rules as list/view.

### Files

- File fields store uploads in `pb_data/storage/`.
- Public static assets can be served from `pb_public/`.

## Architecture decisions

### Prefer direct client access

PocketBase is designed for **client → PocketBase** communication with API rules enforcing security.

Avoid wrapping PocketBase in SvelteKit/Next.js server routes unless necessary:

- Adds double network hops and latency
- Complicates JWT/cookie state
- Concentrates traffic on one IP (rate limits)

### Prefer JS hooks for privileged server logic

When clients need elevated operations (payments, external APIs, admin-only mutations):

1. Add a custom route or record hook in `pb_hooks/` (**pocketbase-jsvm**)
2. Call it from the client via `pb.send()` (**pocketbase-js-sdk**)

Do **not** instantiate the JS SDK inside hooks to call the same server — use `$app` APIs directly.

### When server-side SDK access is OK

- CLI tools, admin scripts, mothership internal services
- Aggregations that cannot be expressed in rules or hooks
- Integrations that must stay off the client

## PocketHost context

This monorepo is the PocketHost platform. For hosting-specific details (FTP dirs, instance URLs, limits), see [pockethost-hosting.md](pockethost-hosting.md).

## Official reference links

- Collections & fields: https://pocketbase.io/docs/collections/
- API rules: https://pocketbase.io/docs/api-rules-and-filters/
- Authentication: https://pocketbase.io/docs/authentication/
- Migrations: https://pocketbase.io/docs/migrations/
- Files: https://pocketbase.io/docs/files-handling/

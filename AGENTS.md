# PocketHost

PocketHost is a multi-tenant PocketBase hosting platform. This monorepo holds the platform code, the customer CLI and
the website. Instructions here are for coding agents and contributors; read them before changing code.

## Layout

| Path | What it is |
|---|---|
| `packages/pockethost-go` | The `pockethost` Go binary, built on [PocketOne](https://github.com/pockethost/pocketone) plugins. Roles: `pockethost edge serve --config pocketone.yaml` (edges) and `pockethost mothership` (control plane). See its README. |
| `packages/server` | The legacy Node stack (mothership, edge daemon, firewall, instance lifecycle). Still runs one edge; edge-facing changes here must also land in `packages/pockethost-go`. |
| `packages/server/src/mothership-app` | The mothership's PocketBase app: TS handlers bundled by tsdown into `pb_hooks/`, plus migrations. Runs in PocketBase's Goja JSVM, not Node. |
| `packages/dashboard` | SvelteKit site: marketing, docs (`src/routes/(static)/docs/`), blog, customer dashboard. |
| `packages/cli` | The customer CLI, published to npm as `pockethost` (formerly `phio`). |
| `packages/pockethost-instance` | Docker image for per-instance containers on the Node edge. |

Stack: TypeScript (ESM), pnpm workspaces, Commander, PocketBase JS SDK; Go 1.27 for `packages/pockethost-go`.

## Build and test

- `pnpm install`, then `pnpm check:push` before any push. `.husky/pre-push` runs it: Prettier, `tsc` for server, CLI
  and dashboard, the mothership hook freshness check, and `vitest`. Use `pnpm check:ci` after dashboard route changes.
- Mothership hooks: edit TS under `packages/server/src/mothership-app/src/`, never `pb_hooks/` by hand. Rebuild with
  `pnpm --filter pockethost-mothership-app build`, then `pnpm sync:mothership-embed` (the Go binary embeds a copy) and
  commit both outputs. Import rules: `.cursor/rules/mothership-hooks.mdc`.
- Go: from `packages/pockethost-go`, `GOTOOLCHAIN=local go build -o /dev/null ./... && go vet ./... && go test ./...`.
  A plain `go build` writes a binary into the tree; never commit binaries. Stage files by name, not `git add -A`.
- Some dashboard tests need `pnpm --filter @pockethost/dashboard exec svelte-kit sync` in a fresh checkout.

## Conventions

- Prefer factory functions returning an API object (`createX`, `mkX`) over classes; early returns; match the file's
  existing conventions (`@` imports in `packages/server`).
- Customer-facing copy (UI strings, docs, blog): no em dashes and no semicolon-joined clauses; say "instances", not
  "slots". Docs and blog are for people hosting on PocketHost, not self-host operators (`.cursor/rules/end-user-docs.mdc`).
- Keep compatibility with what the legacy Node edge sends and expects; there is no compatibility promise for older Go
  edge configs or commands.

## Guardrails

- Don't start hosting services (`mothership`, `firewall`, `edge`, `serve`) or run production builds and deploys unless
  the task needs it. They spawn instances and bind ports.
- Before the first `serve` of any fresh PocketBase data dir, create a superuser from the CLI
  (`pocketbase superuser upsert admin@example.com password --dir=<dir>`).
- This repo is public. Plans, roadmaps, backlog, internal notes and customer data don't belong here, including at the
  root. Maintainers keep them in a private sibling repo.

Scoped rules for Cursor and other tools live in `.cursor/rules/`; reusable skills in `.cursor/skills/`.

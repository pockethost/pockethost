---
name: check-push
description: >-
  Run pnpm check:push (lint, types, tests) before git push or PR-ready work.
  Use when the user asks to push, open a PR, reports a failed pre-push hook,
  or when substantive code changes are finished and push is next.
---

# check:push

Prevents `.husky/pre-push` failures. Command mirrors CI quality + mothership hook freshness (no dashboard build).

## Run

```bash
pnpm check:push
```

Equivalent to:

```bash
pnpm lint && \
  pnpm --filter pockethost check:types && \
  pnpm --filter phio check:types && \
  pnpm --filter @pockethost/dashboard check:types && \
  pnpm check:mothership-hooks && \
  pnpm test
```

## Procedure

1. Run `pnpm check:push` from repo root.
2. On failure, fix only what the output names. Re-run the **failing step** (or full `check:push` before push).
3. Repeat until exit code 0.
4. Only then suggest `git push` or create the PR.

Do not use `--no-verify` unless the user explicitly asked to skip hooks.

## Failure triage

### Prettier (`pnpm lint`)

```bash
pnpm lint:fix
```

Or format touched files only. Re-run `pnpm lint`.

### Types — pockethost

```bash
pnpm --filter pockethost check:types
```

### Types — phio

```bash
pnpm --filter phio check:types
```

### Types — dashboard

```bash
pnpm --filter @pockethost/dashboard check:types
```

### Mothership hooks stale

```bash
pnpm --filter pockethost-mothership-app build
```

Commit regenerated `pb_hooks/`, then re-run `pnpm check:mothership-hooks`.

### Tests

```bash
pnpm test
```

For a single file: `pnpm vitest run path/to/file.test.ts`

## Dashboard build (CI only)

Pre-push does **not** run dashboard `build`. **`svelte-check` will not catch prerender failures.**

Run **`pnpm check:ci`** (adds dashboard `build`) before push or merge when you changed any of:

- Files under `packages/dashboard/src/routes/(static)/`
- `$page.url`, `page.url.searchParams`, query-string banners, or URL-driven UI
- `+layout.ts` / `+page.ts` with `prerender`, `ssr`, or `csr`
- `svelte.config`, Vite config, or static adapter settings

```bash
pnpm check:ci
```

### Prerender build failure

Symptom: `Cannot access url.searchParams on a page with prerendering enabled` or `Error: 500 /some-route` during `vite build`.

Fix: see **Prerender (static routes)** in [.cursor/rules/dashboard-ux.mdc](../../rules/dashboard-ux.mdc). Usually guard with `browser` or move the read to `onMount`. Re-run `pnpm check:ci`.

## Pair with commit

After `/commit` or when commits are done and push is next, run `check:push` **before** `git push`.

## Report

State pass/fail, what you fixed, and that the branch is safe to push (or what still blocks).

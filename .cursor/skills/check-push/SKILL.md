---
name: check-push
description: >-
  Run pnpm check:push (lint, types, tests) before git push or PR-ready work.
  Use when the user asks to push, open a PR, reports a failed pre-push hook,
  or when substantive code changes are finished and push is next.
---

# check:push

Prevents `.husky/pre-push` failures. Command mirrors CI quality (no dashboard build).

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

### Tests

```bash
pnpm test
```

For a single file: `pnpm vitest run path/to/file.test.ts`

## Dashboard build (CI only)

Pre-push does **not** run dashboard `build`. If you changed dashboard build inputs (routes, `svelte.config`, env, Vite config), also run:

```bash
pnpm check:ci
```

## Pair with commit

After `/commit` or when commits are done and push is next, run `check:push` **before** `git push`.

## Report

State pass/fail, what you fixed, and that the branch is safe to push (or what still blocks).

---
name: phio
description: >-
  PocketHost customer CLI (phio submodule). Use when changing InstanceFileAccess,
  FTPS, deploy flows, or when validating that server changes still work with
  phio dev/deploy and SamKirkland FTP-Deploy-Action.
---

# phio — PocketHost customer CLI

`packages/phio/` is a **git submodule** ([pockethost/phio](https://github.com/pockethost/phio)). Separate release (Changesets, current `0.3.x`). Not in the pnpm workspace. Runs on **Bun** (`bunx phio`).

Long-term: may merge into this monorepo or rename `packages/pockethost` → `pockethost-server` and reclaim the `pockethost` npm name for the CLI. Until then, treat phio as the **compatibility contract** for customer deploy tooling.

## Commands

| Command | Purpose |
|---------|---------|
| `phio login` / `logout` / `whoami` | Mothership auth (email + password → cookie in `~/.config/phio/config.json`) |
| `phio list` | List instances |
| `phio link <instance>` | Save default instance to `package.json` (`pockethost.instanceName`) or `pockethost.json` |
| `phio dev [instance]` | Chokidar watch → FTPS sync on change |
| `phio deploy [instance]` | One-shot FTPS sync |
| `phio logs [instance]` | SSE tail via `https://{subdomain}.pockethost.io/logs` |
| `phio info` | Instance metadata |

Env overrides: `PHIO_USERNAME`, `PHIO_PASSWORD`, `PHIO_INSTANCE_NAME`, `PHIO_MOTHERSHIP_URL`, `PHIO_HOME`.

## Deploy path (FTPS)

`dev` and `deploy` use `@samkirkland/ftp-deploy` (fork: `github:benallfree/ftp-deploy`):

- **Server:** `ftp.pockethost.io` (FTPS, port 21)
- **Username:** `__auth__` (magic — not a real user)
- **Password:** PocketBase auth cookie from `client.authStore.exportToCookie()`
- **Remote dir:** `{subdomain}/` (instance root)
- **Includes:** `pb_*`, `package.json`, `bun.lock(b)`, `patches/**`
- **Excludes:** `pb_data/**`

Server-side: `authenticateFileAccess()` in `packages/pockethost/src/services/InstanceFileAccess/auth.ts` recognizes `__auth__` and loads the cookie.

### Deploy sync state file

`ftp-deploy` writes `.ftp-deploy-sync-state.json` at the **instance root** (`/{subdomain}/.ftp-deploy-sync-state.json`). Same file is used by [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) in CI.

`InstanceVfs` guards must allow this file at instance root. Blocking it breaks `phio deploy` and GitHub Actions FTP deploy.

## Compatibility checklist

When changing **any** of these server areas, verify phio still works:

| Server area | phio touchpoint |
|-------------|-----------------|
| `InstanceFileAccess/` (`InstanceVfs`, `guards.ts`) | `phio dev` / `deploy` via FTPS `PhFs` |
| `InstanceFileAccess/auth.ts` | `__auth__` cookie login |
| `edge ftp` / `PhFs` | Same VFS as above |
| Mothership `instances` collection | `list`, `link`, instance resolution |
| Instance logs SSE endpoint | `phio logs` |
| FTPS sunset / removal | **Breaking** for phio until phio migrates to SFTP |

### Quick smoke test (local)

1. `pnpm dev:cli serve` (mothership + edge + FTPS + SFTP)
2. In a project with `pockethost.json`: `cd packages/phio && bun run dev -- deploy <subdomain> -v`
3. Confirm sync completes and `.ftp-deploy-sync-state.json` is written at instance root

Submodule update: `git submodule update --init packages/phio`

## Related server code

- Shared VFS: `packages/pockethost/src/services/InstanceFileAccess/`
- FTPS adapter: `packages/pockethost/src/cli/commands/EdgeCommand/FtpCommand/FtpService/PhFs.ts`
- SFTP (not used by phio yet): `packages/pockethost/src/cli/commands/SftpCommand/`

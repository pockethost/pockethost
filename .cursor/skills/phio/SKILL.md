---
name: phio
description: >-
  PocketHost customer CLI (packages/phio). Use when changing InstanceFileAccess,
  FTPS, deploy flows, or when validating that server changes still work with
  phio dev/deploy and SamKirkland FTP-Deploy-Action.
---

# phio — PocketHost customer CLI

`packages/phio/` is the **customer CLI** in this monorepo. pnpm workspace package; Node 24 + tsx (same pattern as `pockethost`). Run via `pnpm --filter phio dev -- …` or `pnpm exec phio …`.

Long-term: may rename `packages/pockethost` → `pockethost-server` and publish CLI as `pockethost`. Until then, treat phio as the **compatibility contract** for customer deploy tooling.

## Commands

| Command | Purpose |
|---------|---------|
| `phio login` / `logout` / `info` (`whoami`) | Mothership auth; `info` shows config + deploy key (syncs key when logged in) |
| `phio list` | List instances |
| `phio link <instance>` | Save default instance to `package.json` (`pockethost.instanceName`) or `pockethost.json` |
| `phio dev [instance]` | Chokidar watch → FTPS sync on change |
| `phio deploy [instance]` | One-shot FTPS sync |
| `phio logs [instance]` | SSE tail via `https://{subdomain}.pockethost.io/logs` |

Env overrides: `PHIO_USERNAME`, `PHIO_PASSWORD`, `PHIO_INSTANCE_NAME`, `PHIO_MOTHERSHIP_URL`, `PHIO_HOME`.

## Deploy key (SFTP prep)

On `phio login`, `phio info` / `whoami`, and before each `dev`/`deploy` sync, `ensureDeployKey()` (`src/lib/deployKey.ts`):

1. Generates or loads an Ed25519 keypair under `PHIO_HOME` (default `~/.config/phio/`):
   - `phio_deploy_ed25519` (private, PEM PKCS8)
   - `phio_deploy_ed25519.pub` (public, OpenSSH line)
2. Verifies Account → Keys has a key labeled **`Phio`** whose public key matches the local `.pub`.
3. Creates the remote `ssh_keys` record on first run (`all_instances: true`).

Mismatch (remote `Phio` key ≠ local `.pub`) throws with a link to `/account/keys`. Delete local key files to regenerate.

## Deploy path (FTPS)

`dev` and `deploy` use the vendored Kirkland sync engine at `vendor/ftp-deploy/` (from [benallfree/ftp-deploy](https://github.com/benallfree/ftp-deploy) @ `132389e`):

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
2. In a project with `pockethost.json`: `pnpm --filter phio dev -- deploy <subdomain> -v`
3. Confirm sync completes and `.ftp-deploy-sync-state.json` is written at instance root

## Related server code

- Shared VFS: `packages/pockethost/src/services/InstanceFileAccess/`
- FTPS adapter: `packages/pockethost/src/cli/commands/EdgeCommand/FtpCommand/FtpService/PhFs.ts`
- SFTP (not used by phio yet): `packages/pockethost/src/cli/commands/SftpCommand/`

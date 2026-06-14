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
| `phio link <instance>` | Save default instance to `.phioconfig` (migrates legacy `package.json` / `pockethost.json`) |
| `phio dev [instance]` | Chokidar watch → SFTP sync on change |
| `phio deploy [instance]` | One-shot SFTP sync |
| `phio sftp [instance]` | Interactive SFTP session (system `sftp` client; `--print` for command only) |
| `phio logs [instance]` | SSE tail via `https://{subdomain}.pockethost.io/logs` |

Env overrides: `PHIO_USERNAME`, `PHIO_PASSWORD`, `PHIO_INSTANCE_NAME`, `PHIO_MOTHERSHIP_URL`, `PHIO_HOME`.

## Documentation (required for user-facing changes)

Update **both** in the same PR:

- `packages/phio/README.md`
- `packages/dashboard/src/routes/(static)/docs/phio/+page.md`

See [`.cursor/rules/phio.mdc`](../../rules/phio.mdc). Blog posts are optional announcements, not a substitute.

## Deploy key (SFTP prep)

On `phio login`, `phio info` / `whoami`, and before each `dev`/`deploy` sync, `ensureDeployKey()` (`src/lib/deployKey.ts`):

1. Generates or loads an Ed25519 keypair under `PHIO_HOME` (default `~/.config/phio/`):
   - `phio_deploy_ed25519` (private, PEM PKCS8)
   - `phio_deploy_ed25519.pub` (public, OpenSSH line)
2. Verifies Account → Keys has a key labeled **`Phio`** whose public key matches the local `.pub`.
3. Creates the remote `ssh_keys` record on first run (`all_instances: true`).

Mismatch (remote `Phio` key ≠ local `.pub`) throws with a link to `/account/keys`. Delete local key files to regenerate.

## Deploy path (SFTP)

`dev` and `deploy` use the vendored Kirkland sync engine at `vendor/ftp-deploy/` (from [benallfree/ftp-deploy](https://github.com/benallfree/ftp-deploy) @ `132389e`), with **SFTP transport** (`protocol: sftp`, `ssh2-sftp-client`):

- **Server:** `ftp.pockethost.io` (SFTP, port 2222)
- **Username:** PocketHost account email
- **Auth:** Ed25519 deploy key (`ensureDeployKey()` → `private-key-path`)
- **Remote dir:** `{subdomain}/` (instance root)
- **Includes:** `pb_*`, `package.json`, `bun.lock(b)`, `patches/**`
- **Excludes:** `pb_data/**`

Server-side: `findSshKeyByPublicKey()` in `packages/pockethost/src/services/InstanceFileAccess/sshKeyAuth.ts` + scoped `InstanceVfs` (same VFS as legacy FTPS).

Legacy FTPS (`__auth__` cookie on port 21) is still supported by the vendored engine via `protocol: ftps` but phio no longer uses it.

### Deploy sync state file

`ftp-deploy` writes `.ftp-deploy-sync-state.json` at the **instance root** (`/{subdomain}/.ftp-deploy-sync-state.json`). Same file is used by [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) in CI.

`InstanceVfs` guards must allow this file at instance root. Blocking it breaks `phio deploy` and GitHub Actions FTP deploy.

## Compatibility checklist

When changing **any** of these server areas, verify phio still works:

| Server area | phio touchpoint |
|-------------|-----------------|
| `InstanceFileAccess/` (`InstanceVfs`, `guards.ts`) | `phio dev` / `deploy` via SFTP `InstanceVfs` |
| `InstanceFileAccess/sshKeyAuth.ts` | Ed25519 deploy key (`Phio` label) |
| `sftp` / `InstanceVfs.cwd` | REALPATH updates cwd for relative deploy paths |
| Mothership `instances` collection | `list`, `link`, instance resolution |
| Instance logs SSE endpoint | `phio logs` |
| FTPS sunset / removal | phio migrated to SFTP; FTPS removal unblocked after docs/CI |

### Quick smoke test (local)

1. `pnpm dev:cli serve` (mothership + edge + SFTP)
2. In a project with `.phioconfig`: `pnpm --filter phio dev -- deploy <subdomain> -v`
3. Confirm sync completes and `.ftp-deploy-sync-state.json` is written at instance root

## Related server code

- Shared VFS: `packages/pockethost/src/services/InstanceFileAccess/`
- SFTP adapter: `packages/pockethost/src/cli/commands/SftpCommand/`
- Legacy FTPS adapter: `packages/pockethost/src/cli/commands/EdgeCommand/FtpCommand/FtpService/PhFs.ts`

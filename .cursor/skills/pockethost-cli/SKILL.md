---
name: pockethost-cli
description: >-
  PocketHost customer CLI (packages/cli, npm `pockethost`, formerly `phio`). Use
  when changing InstanceFileAccess, SFTP, deploy flows, or when validating that
  server changes still work with `pockethost dev/deploy` and SamKirkland
  FTP-Deploy-Action.
---

# pockethost — PocketHost customer CLI

`packages/cli/` is the **customer CLI** in this monorepo, published to npm as **`pockethost`** (≥3.0). Before 3.0 it
was published as `phio` (npm `phio` is deprecated). The hosting stack is the private workspace package
`@pockethost/server` (`packages/server/`), which is never published.

- Dev: `pnpm dev:cli-client -- …` or `pnpm --filter pockethost dev -- …` (tsx, from source)
- Build: `pnpm --filter pockethost build` → `dist/cli.js` (esbuild bundle, `#!/usr/bin/env node`, Node >=20).
  Only `ssh2-sftp-client` stays a runtime dependency (ssh2 loads optional native addons). Everything else is a
  devDependency that gets bundled.
- Publish: `pnpm publish` from `packages/cli` (`prepublishOnly` runs types, tests, build). Before publishing, install
  the packed tarball globally in a clean prefix **without `tsx` on PATH** and run `pockethost --version`.

Treat the CLI as the **compatibility contract** for customer deploy tooling.

## Commands

| Command | Purpose |
|---------|---------|
| `pockethost login` / `logout` / `info` (`whoami`) | Mothership auth; `info` shows config + deploy key (syncs key when logged in) |
| `pockethost list` | List instances |
| `pockethost link <instance>` | Save default instance to `.pockethostconfig` |
| `pockethost dev [instance]` | Chokidar watch → SFTP sync on change |
| `pockethost deploy [instance]` | One-shot SFTP sync |
| `pockethost sftp [instance]` | Interactive SFTP session (system `sftp` client; `--print` for command only) |
| `pockethost logs [instance]` | SSE tail via `https://{subdomain}.pockethost.io/logs` |

Env overrides: `POCKETHOST_USERNAME`, `POCKETHOST_PASSWORD`, `POCKETHOST_INSTANCE_NAME`, `POCKETHOST_MOTHERSHIP_URL`,
`POCKETHOST_HOME`, `POCKETHOST_PROJECT_DIR`. The pre-3.0 `PHIO_*` names still work with a one-time deprecation warning
(`envVar()` in `src/lib/constants.ts`); drop them at the next major.

## Migration from phio (automatic)

All in `src/lib/constants.ts` / `src/lib/defaultInstanceId.ts`, covered by `src/lib/migration.test.ts`:

- **Config folder** `envPaths('phio')` (`~/.config/phio-nodejs`) → `envPaths('pockethost', { suffix: '' })` (`~/.config/pockethost/`) on Linux: copied (not
  moved) on first use when the new folder has no login or key. `phio_deploy_ed25519*` → `pockethost_deploy_ed25519*`.
- **Project file** lookup: `.pockethostconfig` → `.phioconfig` → `package.json` `pockethost.instanceName` →
  `pockethost.json`. Old files are rewritten to `.pockethostconfig` and removed.
- **Deploy key label**: new keys are `PocketHost CLI`; lookup also matches the old `Phio` label so upgrades don't
  register a second key.

## Documentation (required for user-facing changes)

Update **both** in the same PR:

- `packages/cli/README.md`
- the CLI docs page under `packages/dashboard/src/routes/(static)/docs/`

See [`.cursor/rules/pockethost-cli.mdc`](../../rules/pockethost-cli.mdc). Blog posts are optional announcements, not a
substitute.

## Deploy key (SFTP prep)

On `pockethost login`, `info` / `whoami`, and before each `dev`/`deploy` sync, `ensureDeployKey()`
(`src/lib/deployKey.ts`):

1. Generates or loads an Ed25519 keypair under `POCKETHOST_HOME` (default `~/.config/pockethost/`):
   - `pockethost_deploy_ed25519` (private, OpenSSH format; legacy PKCS#8 is migrated on use)
   - `pockethost_deploy_ed25519.pub` (public, OpenSSH line)
2. Verifies Account → Keys has a key labeled **`PocketHost CLI`** (or legacy **`Phio`**) whose public key matches the
   local `.pub`.
3. Creates the remote `ssh_keys` record on first run (`all_instances: true`, label `PocketHost CLI`).

Mismatch (remote key ≠ local `.pub`) throws with a link to `/account/keys`. Delete local key files to regenerate.

## Deploy path (SFTP)

`dev` and `deploy` use the vendored Kirkland sync engine at `vendor/ftp-deploy/` (from
[benallfree/ftp-deploy](https://github.com/benallfree/ftp-deploy) @ `132389e`), with **SFTP transport**
(`protocol: sftp`, `ssh2-sftp-client`):

- **Server:** `ftp.pockethost.io` (SFTP, port 2222)
- **Username:** PocketHost account email
- **Auth:** Ed25519 deploy key (`ensureDeployKey()` → `private-key-path`)
- **Remote dir:** `{subdomain}/` (instance root)
- **Includes:** `pb_*`, `package.json`, `bun.lock(b)`, `patches/**`
- **Excludes:** `pb_data/**`

Server-side: `findSshKeyByPublicKey()` in `packages/server/src/services/InstanceFileAccess/sshKeyAuth.ts` +
scoped `InstanceVfs` (same VFS as legacy FTPS).

### Deploy sync state file

`ftp-deploy` writes `.ftp-deploy-sync-state.json` at the **instance root** (`/{subdomain}/.ftp-deploy-sync-state.json`).
Same file is used by [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) in CI.

`InstanceVfs` does not restrict instance-root files or folders. `pb_data` still requires power-off. CLI deploy and
FTP-Deploy-Action sync freely at `/{subdomain}/`.

## Compatibility checklist

When changing **any** of these server areas, verify the CLI still works:

| Server area | CLI touchpoint |
|-------------|----------------|
| `InstanceFileAccess/` (`InstanceVfs`, `guards.ts`) | `dev` / `deploy` via SFTP `InstanceVfs` |
| `InstanceFileAccess/sshKeyAuth.ts` | Ed25519 deploy key (`PocketHost CLI` / `Phio` label) |
| `sftp` / `InstanceVfs.cwd` | REALPATH updates cwd for relative deploy paths |
| Mothership `instances` collection | `list`, `link`, instance resolution |
| Mothership `ssh_keys` list rule | deploy key lookup filters by `label` (both labels) |
| Instance logs SSE endpoint | `logs` |

### Quick smoke test (local)

1. `pnpm dev:cli serve` (mothership + edge + SFTP)
2. In a project with `.pockethostconfig`: `pnpm dev:cli-client -- deploy <subdomain> -v`
3. Confirm sync completes and `.ftp-deploy-sync-state.json` is written at instance root

## Related server code

- Shared VFS: `packages/server/src/services/InstanceFileAccess/`
- SFTP adapter: `packages/server/src/cli/commands/SftpCommand/`
- Legacy FTPS adapter: `packages/server/src/cli/commands/EdgeCommand/FtpCommand/FtpService/PhFs.ts`

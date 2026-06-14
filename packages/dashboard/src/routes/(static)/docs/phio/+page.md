---
title: phio CLI
description: Install and use the phio CLI to link, watch, deploy, browse files, and tail logs for PocketHost instances over SFTP
---
# phio CLI

**phio** is the PocketHost command-line tool for syncing local PocketBase project files to your instance and tailing instance logs.

Deploy and watch mode use **SFTP on port 2222** with an Ed25519 deploy key. phio creates and registers that key for you on first use.

## Install

Requires **Node.js 24+**.

```bash
npm install -g phio
```

From the PocketHost monorepo during development:

```bash
pnpm dev:phio -- --help
```

## Quick start

```bash
phio login
phio link my-instance
phio dev
```

1. **`phio login`** — sign in with your PocketHost email and password.
2. **`phio link <instance>`** — save the default instance to `.phioconfig` in the current directory.
3. **`phio dev`** — watch local changes and sync them to the remote instance.

For a one-shot upload without watching:

```bash
phio deploy
```

Pass an instance name on any command to override the linked default:

```bash
phio deploy staging
phio logs my-instance
```

## Commands

| Command | Purpose |
| ------- | ------- |
| `phio login` | Sign in to PocketHost |
| `phio logout` | Clear saved session |
| `phio info` (`whoami`) | Show login, linked instance, and deploy key status |
| `phio list` | List instances on your account |
| `phio link [instance]` | Link this directory to an instance (writes `.phioconfig`) |
| `phio dev [instance]` | Watch local files and sync on change |
| `phio deploy [instance]` | One-shot sync to remote |
| `phio sftp [instance]` | Interactive SFTP session to instance files |
| `phio logs [instance]` | Tail instance logs over SSE |

`dev` and `deploy` accept:

- `-v, --verbose` — verbose sync output
- `-i, --include <patterns...>` — extra include globs (comma-separated values work)
- `-e, --exclude <patterns...>` — extra exclude globs

Default **includes**: `pb_*`, `package.json`, `bun.lock`, `bun.lockb`, `patches/**`.

Default **excludes**: `pb_data/**`.

`phio sftp` accepts:

- `--print` — print the underlying `sftp` command instead of running it (useful when OpenSSH client tools are not installed)

## Interactive SFTP (`phio sftp`)

Browse and edit instance files in an interactive SFTP session. phio uses the same **`Phio`** deploy key as `dev` and `deploy`.

```bash
phio sftp              # linked instance from .phioconfig
phio sftp my-instance  # explicit instance
phio sftp --print      # show the sftp command without running it
```

When a project is linked, phio opens your instance directory (`{subdomain}/`). With no linked instance, phio connects at the SFTP root so you can `cd` into any instance you have access to.

phio runs your system's **`sftp`** client when it is on `PATH` (OpenSSH on macOS/Linux, optional Windows OpenSSH). If `sftp` is missing, phio prints the full command to run manually. See **[SFTP File Access](/docs/ftp)** for client setup on every platform.

This is file access only (`ls`, `cd`, `get`, `put`, and the rest). There is no remote shell or `exec`.

## Linking an instance (`.phioconfig`)

`phio link` writes a `.phioconfig` file in your project root:

```json
{
  "instanceName": "all-your-base"
}
```

Commit this file so teammates and CI know which instance the project deploys to.

### Legacy config migration

Older projects may still have:

- `"pockethost": { "instanceName": "..." }` in `package.json`, or
- a standalone `pockethost.json`

phio migrates those to `.phioconfig` automatically the first time it reads them. Legacy entries are removed from `package.json`, and `pockethost.json` is deleted after migration.

## Deploy key (SFTP auth)

phio does not use your PocketHost password for file sync. On `login`, `info`, and before each `dev`, `deploy`, or `sftp`, phio:

1. Generates or loads an Ed25519 keypair under your phio config directory (default `~/.config/phio/`):
   - `phio_deploy_ed25519` (private key)
   - `phio_deploy_ed25519.pub` (public key)
2. Ensures **[Account → Keys](/account/keys)** has a key labeled **`Phio`** whose public key matches the local `.pub`.
3. Creates the remote key on first run with access to **all instances** on your account.

Run `phio info` to inspect deploy key paths, fingerprint, and remote registration status.

If the remote **`Phio`** key does not match your local key, delete the local key files to regenerate, or update the key in the dashboard. See **[Account access keys](/blog/account-access-keys)** for scoped keys in CI.

## How sync works

phio connects to:

| Setting | Value |
| ------- | ----- |
| Host | `ftp.pockethost.io` |
| Port | `2222` |
| Protocol | SFTP |
| Username | Your PocketHost email |
| Auth | Local **`Phio`** deploy key |
| Remote directory | `{instanceName}/` (instance root) |

Sync is incremental. phio writes `.ftp-deploy-sync-state.json` at the instance root to track what changed. Do not delete that file unless you want a full resync.

Use **`phio sftp`** for an interactive session with the same credentials, or see **[SFTP File Access](/docs/ftp)** for Cyberduck, FileZilla, VS Code extensions, and manual `sftp` setup.

## Environment variables

Override saved config without editing files:

| Variable | Purpose |
| -------- | ------- |
| `PHIO_USERNAME` | PocketHost email (non-interactive login) |
| `PHIO_PASSWORD` | PocketHost password (with `PHIO_USERNAME`) |
| `PHIO_INSTANCE_NAME` | Default instance name |
| `PHIO_MOTHERSHIP_URL` | Mothership API URL (default production) |
| `PHIO_HOME` | phio config directory (default OS config path for `phio`) |

`PHIO_INSTANCE_NAME` takes precedence over `.phioconfig`.

## CI example

Use env-based login and a linked instance name in CI:

```yaml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Deploy to PocketHost
        env:
          PHIO_USERNAME: ${{ secrets.POCKETHOST_EMAIL }}
          PHIO_PASSWORD: ${{ secrets.POCKETHOST_PASSWORD }}
          PHIO_INSTANCE_NAME: my-instance
        run: |
          npm install -g phio
          phio deploy -v
```

Store your PocketHost email and password as repository secrets. phio registers its deploy key on first deploy.

For GitHub Actions that already use [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action), migrate from FTPS on port 21 to SFTP on port 2222 with an Ed25519 private key. See **[FTPS sunset](/blog/ftps-sunset)** for the timeline.

## Troubleshooting

### `No instance name provided and none was found in .phioconfig`

Run `phio link <instance>` in your project directory, or pass the instance name on the command line.

### Deploy key mismatch

The **`Phio`** key in **[Account → Keys](/account/keys)** must match `~/.config/phio/phio_deploy_ed25519.pub`. Delete the local key files and run `phio info` or `phio deploy` to regenerate and re-register.

### Permission denied (publickey) during deploy

Confirm you are logged in (`phio login` or `PHIO_USERNAME`/`PHIO_PASSWORD`), then run `phio info` to verify the deploy key is registered.

### `Could not find 'sftp' on PATH`

Install OpenSSH client tools for your OS, or run `phio sftp --print` and paste the command into your preferred SFTP client. See **[SFTP File Access](/docs/ftp)**.

### Session expired

Run `phio login` again, or set `PHIO_USERNAME` and `PHIO_PASSWORD` for non-interactive environments.

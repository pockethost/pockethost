---
title: PocketHost CLI
description: Install and use the pockethost CLI to link, watch, deploy, browse files, and tail logs for PocketHost instances over SFTP
---
# PocketHost CLI

**`pockethost`** is the PocketHost command-line tool for syncing local PocketBase project files to your instance and tailing instance logs.

Deploy and watch mode use **SFTP on port 2222** with an Ed25519 deploy key. The CLI creates and registers that key for you on first use.

## Install

Requires **Node.js 20+**.

```bash
npm install -g pockethost
```

## Upgrading from phio

Before 3.0, the CLI was called **phio**. Swap the package:

```bash
npm rm -g phio
npm install -g pockethost
```

Then use `pockethost` wherever you used `phio`. Everything carries over the first time you run it:

- **Login and deploy key** are copied from phio's config folder. Your existing **`Phio`** key under **[Account → Keys](/account/keys)** keeps working, so no second key is registered.
- **`.phioconfig`** is renamed to **`.pockethostconfig`**. Commit the new file.
- **`PHIO_*` environment variables** still work and print a warning. Rename them to `POCKETHOST_*` (for example `PHIO_USERNAME` → `POCKETHOST_USERNAME`) before the next major version drops them.

## Quick start

```bash
pockethost login
pockethost link my-instance
pockethost dev
```

1. **`pockethost login`**: sign in with your PocketHost email and password.
2. **`pockethost link <instance>`**: save the default instance to `.pockethostconfig` in the current directory.
3. **`pockethost dev`**: watch local changes and sync them to the remote instance.

For a one-shot upload without watching:

```bash
pockethost deploy
```

Pass an instance name on any command to override the linked default:

```bash
pockethost deploy staging
pockethost logs my-instance
```

## Commands

| Command | Purpose |
| ------- | ------- |
| `pockethost login` | Sign in to PocketHost |
| `pockethost logout` | Clear saved session |
| `pockethost info` (`whoami`) | Show login, linked instance, and deploy key status |
| `pockethost list` (`ls`) | List instances on your account |
| `pockethost link [instance]` | Link this directory to an instance (writes `.pockethostconfig`) |
| `pockethost dev [instance]` | Watch local files and sync on change |
| `pockethost deploy [instance]` | One-shot sync to remote |
| `pockethost sftp [instance]` | Interactive SFTP session to instance files |
| `pockethost logs [instance]` | Tail instance logs |

`dev` and `deploy` accept:

- `-v, --verbose`: verbose sync output
- `-i, --include <patterns...>`: extra include globs (comma-separated values work)
- `-e, --exclude <patterns...>`: extra exclude globs

Default **includes**: `pb_*`, `package.json`, `bun.lock`, `bun.lockb`, `patches/**`.

Default **excludes**: `pb_data/**`.

`pockethost sftp` accepts:

- `--print`: print the underlying `sftp` command instead of running it (useful when OpenSSH client tools are not installed)

## Interactive SFTP (`pockethost sftp`)

Browse and edit instance files in an interactive SFTP session. It uses the same deploy key as `dev` and `deploy`.

```bash
pockethost sftp              # linked instance from .pockethostconfig
pockethost sftp my-instance  # explicit instance
pockethost sftp --print      # show the sftp command without running it
```

When a project is linked, the session opens in your instance directory (`{subdomain}/`). With no linked instance, it connects at the SFTP root so you can `cd` into any instance you have access to.

The CLI runs your system's **`sftp`** client when it is on `PATH` (OpenSSH on macOS/Linux, optional Windows OpenSSH). If `sftp` is missing, it prints the full command to run manually. See **[SFTP File Access](/docs/ftp)** for client setup on every platform.

This is file access only (`ls`, `cd`, `get`, `put`, and the rest). There is no remote shell or `exec`.

## Linking an instance (`.pockethostconfig`)

`pockethost link` writes a `.pockethostconfig` file in your project root:

```json
{
  "instanceName": "all-your-base"
}
```

Commit this file so teammates and CI know which instance the project deploys to.

### Older project files

Older projects may still have one of:

- a `.phioconfig` file (from phio),
- `"pockethost": { "instanceName": "..." }` in `package.json`, or
- a standalone `pockethost.json`

The CLI migrates these to `.pockethostconfig` automatically the first time it reads them and removes the old entry.

## Deploy key (SFTP auth)

The CLI does not use your PocketHost password for file sync. On `login`, `info`, and before each `dev`, `deploy`, or `sftp`, it:

1. Generates or loads an Ed25519 keypair in its config folder (`~/.config/pockethost/` on Linux, your OS config folder elsewhere):
   - `pockethost_deploy_ed25519` (private key)
   - `pockethost_deploy_ed25519.pub` (public key)
2. Ensures **[Account → Keys](/account/keys)** has a key labeled **`PocketHost CLI`** (or **`Phio`**, if you set it up with phio) whose public key matches the local `.pub`.
3. Creates the remote key on first run with access to **all instances** on your account.

Run `pockethost info` to inspect deploy key paths, fingerprint, and remote registration status.

If the remote key does not match your local key, delete the local key files to regenerate, or update the key in the dashboard. See **[Account access keys](/blog/account-access-keys)** for scoped keys in CI.

## How sync works

The CLI connects to:

| Setting | Value |
| ------- | ----- |
| Host | `ftp.pockethost.io` |
| Port | `2222` |
| Protocol | SFTP |
| Username | Your PocketHost email |
| Auth | Local deploy key |
| Remote directory | `{instanceName}/` (instance root) |

Sync is incremental. The CLI writes `.ftp-deploy-sync-state.json` at the instance root to track what changed. Do not delete that file unless you want a full resync.

Use **`pockethost sftp`** for an interactive session with the same credentials, or see **[SFTP File Access](/docs/ftp)** for Cyberduck, FileZilla, VS Code extensions, and manual `sftp` setup.

## Environment variables

Override saved config without editing files:

| Variable | Purpose |
| -------- | ------- |
| `POCKETHOST_USERNAME` | PocketHost email (non-interactive login) |
| `POCKETHOST_PASSWORD` | PocketHost password (with `POCKETHOST_USERNAME`) |
| `POCKETHOST_INSTANCE_NAME` | Default instance name |
| `POCKETHOST_MOTHERSHIP_URL` | Mothership API URL (default production) |
| `POCKETHOST_HOME` | Config folder for login and deploy key |
| `POCKETHOST_PROJECT_DIR` | Project folder (default: found from the current directory) |

`POCKETHOST_INSTANCE_NAME` takes precedence over `.pockethostconfig`. The older `PHIO_*` names still work with a warning.

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
          POCKETHOST_USERNAME: ${{ secrets.POCKETHOST_EMAIL }}
          POCKETHOST_PASSWORD: ${{ secrets.POCKETHOST_PASSWORD }}
          POCKETHOST_INSTANCE_NAME: my-instance
        run: |
          npm install -g pockethost
          pockethost deploy -v
```

Store your PocketHost email and password as repository secrets. The CLI registers its deploy key on first deploy.

For GitHub Actions that already use [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action), use SFTP on port 2222 with an Ed25519 private key. FTPS on port 21 is off. See **[FTPS officially sunset](/blog/ftps-officially-sunset)**.

## Troubleshooting

### `No instance name provided and none was found in .pockethostconfig`

Run `pockethost link <instance>` in your project directory, or pass the instance name on the command line.

### Deploy key mismatch

The **`PocketHost CLI`** (or **`Phio`**) key in **[Account → Keys](/account/keys)** must match `pockethost_deploy_ed25519.pub` in the CLI's config folder. Delete the local key files and run `pockethost info` or `pockethost deploy` to regenerate and re-register.

### Permission denied (publickey) during deploy

Confirm you are logged in (`pockethost login` or `POCKETHOST_USERNAME`/`POCKETHOST_PASSWORD`), then run `pockethost info` to verify the deploy key is registered.

### `Could not find 'sftp' on PATH`

Install OpenSSH client tools for your OS, or run `pockethost sftp --print` and paste the command into your preferred SFTP client. See **[SFTP File Access](/docs/ftp)**.

### `phio: command not found` or old commands

phio is now `pockethost`. See **[Upgrading from phio](#upgrading-from-phio)**.

### Session expired

Run `pockethost login` again, or set `POCKETHOST_USERNAME` and `POCKETHOST_PASSWORD` for non-interactive environments.

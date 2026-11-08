---
title: PocketHost CLI
description: Install and use the pockethost CLI to link, watch, deploy, browse, download and upload files, and tail logs for PocketHost instances
---
# PocketHost CLI

**`pockethost`** is the PocketHost command-line tool for deploying local PocketBase project files to your instance, managing the files on it, and tailing instance logs.

`deploy` and `dev` upload over HTTPS: the CLI sends only the files that changed, and PocketHost swaps them in all at once. The CLI signs in with a **personal access token**, on your computer and in CI alike.

> **PocketHost is retiring SFTP file access on February 6, 2027.** `pockethost sftp` and `--sftp` stop working then. Use `deploy`/`dev` for code and the [file commands](#files) for everything else. See [Service update: SFTP sunset and CLI upgrade](/blog/sftp-sunset).

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

- **Your SFTP key** is copied from phio's config folder, and your existing **`Phio`** key under **[Account → Keys](/account/keys)** keeps working. Run `pockethost login` once to save a token.
- **`.phioconfig`** is renamed to **`.pockethostconfig`**. Commit the new file.
- **`PHIO_*` environment variables** still work and print a warning. Rename them to `POCKETHOST_*` (for example `PHIO_INSTANCE_NAME` → `POCKETHOST_INSTANCE_NAME`) before a future major version drops them.

## Quick start

```bash
pockethost login
pockethost link my-instance
pockethost dev
```

1. **`pockethost login`**: opens **[Account → API Tokens](/account/tokens)** in your browser. Create a token and paste it back into the terminal.
2. **`pockethost link <instance>`**: save the default instance to `.pockethostconfig` in the current directory.
3. **`pockethost dev`**: watch local changes and deploy them to the instance.

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
| `pockethost login [token]` | Save a personal access token on this computer |
| `pockethost token [set\|clear\|status]` | Save, remove, or check the token |
| `pockethost logout` | Remove the saved token from this computer |
| `pockethost info` (`whoami`) | Show the token, linked instance, and SFTP key status |
| `pockethost list` (`ls`) | List the instances your token can reach |
| `pockethost link [instance]` | Link this directory to an instance (writes `.pockethostconfig`) |
| `pockethost dev [instance]` | Watch local files and deploy on change |
| `pockethost deploy [instance]` | Deploy once |
| `pockethost files [path]` | List files on the instance |
| `pockethost pull [paths...]` | Download instance files into this folder |
| `pockethost upload <local> [remote]` | Upload a file or folder to the instance |
| `pockethost rm <paths...>` | Delete files on the instance |
| `pockethost sftp [instance]` | Interactive SFTP session (retired February 6, 2027) |
| `pockethost logs [instance]` | Tail instance logs |
| `pockethost show [instance]` | Show power, URLs, domain, version and settings |
| `pockethost power on\|off [instance]` | Power an instance on or off |
| `pockethost rename <new-name> [instance]` | Rename an instance (its URL changes) |
| `pockethost version <version> [instance]` | Change the PocketBase version |
| `pockethost versions` | List the PocketBase versions you can run |
| `pockethost domain set\|clear` | Set or remove a custom domain |
| `pockethost dev-mode on\|off [instance]` | Turn dev mode on or off |
| `pockethost admin-sync on\|off [instance]` | Turn admin sync on or off |
| `pockethost auto-vacuum on\|off [instance]` | Turn auto-vacuum on or off |
| `pockethost secrets list\|set\|unset` | Manage secrets (environment variables) |
| `pockethost webhooks list\|add\|rm` | Manage scheduled webhooks |
| `pockethost create [name]` | Create an instance |
| `pockethost delete <instance>` | Delete an instance and its data |

`dev` and `deploy` accept:

- `-v, --verbose`: list every uploaded, changed, and deleted file
- `-i, --include <patterns...>`: extra include globs (comma-separated values work)
- `-e, --exclude <patterns...>`: extra exclude globs
- `--no-node-modules`: don't ship `node_modules` (see [Packages](#packages-node_modules))
- `--sftp`: sync over SFTP with your SSH key instead of HTTPS (retired February 6, 2027)

`deploy` also accepts `--commit <sha>` and `-m, --message <note>` to record with the deploy. In GitHub Actions the commit SHA is picked up automatically. `--dry-run` lists what would be deployed without deploying, and `--out <dir>` writes the deploy set to a local folder so you can inspect exactly what your instance would receive.

Default **includes**: `pb_*`, `package.json`, `bun.lock`, `bun.lockb`, `patches/**`.

Default **excludes**: `pb_data/**`.

`pockethost sftp` accepts:

- `--print`: print the underlying `sftp` command instead of running it (useful when OpenSSH client tools are not installed)

## Files

Four commands work with the files on your instance over HTTPS, using the same token as `deploy`. They reach `pb_hooks`, `pb_migrations`, `pb_public` and other `pb_*` folders, `pb_data`, `node_modules`, `package.json`, `bun.lock(b)` and `patches/`. They use the linked instance, or pass `-I <instance>`.

| Command | What it does |
| ------- | ------------ |
| `pockethost files [path] [-r]` | List a folder (`-r` for everything below it). `--json` for scripts |
| `pockethost pull [paths...]` | Download into the current folder. With no paths, everything except `pb_data` and `node_modules`. `--data` adds `pb_data`, `-d <dir>` picks another folder, `-n` shows what would download |
| `pockethost upload <local> [remote]` | Upload a file or folder. The remote path defaults to the same relative path |
| `pockethost rm <paths...> [-r]` | Delete files. `-r` deletes a folder and everything in it |

Reading needs any token for the instance. `upload` and `rm` need write access.

**`pb_data` needs the instance powered off**, for reading and writing. Power it off in the dashboard, run the command, then power it back on.

`pull` skips files that haven't changed since your last pull, so running it again is quick.

### Start from what's on your instance

If your instance has files that aren't in a local project yet (say you've been editing over SFTP), pull them before your first deploy:

```bash
mkdir my-app && cd my-app
pockethost link my-instance
pockethost pull
pockethost deploy
```

`deploy` removes files on the instance that aren't in your project, so pulling first means nothing gets lost.

### Download a copy of your data

```bash
pockethost pull --data pb_data
```

### Move an existing `pb_data` in

Power off the instance, then:

```bash
pockethost upload ./pb_data
```

Large files are uploaded in pieces, so a big `data.db` works. If your settings are encrypted, add `PB_ENCRYPTION_KEY` first. See [Encrypted settings](/docs/encryption).

### Packages (`node_modules`)

PocketHost doesn't run `npm install`. When your `package.json` has `dependencies`, `pockethost deploy` ships your production `node_modules` instead: the packages in `dependencies` and everything they need, never `devDependencies`. Install locally first, then deploy:

```bash
npm install
pockethost deploy
```

It works with npm, pnpm, Bun and workspaces. Symlinks are followed, so your instance gets plain files. A workspace package ships only the files its `files` field publishes. Run `pockethost deploy --dry-run` to see the list. Only changed files upload, so later deploys are quick.

Requires CLI 4.2 or later. `--no-node-modules` leaves the instance's `node_modules` as it is.

### Remove a migration that won't run

```bash
pockethost files pb_migrations
pockethost rm pb_migrations/1700000000_bad.js
```

## Interactive SFTP (`pockethost sftp`)

> SFTP is being retired on February 6, 2027. Use the [file commands](#files) instead.

Browse and edit instance files in an interactive SFTP session. It uses the CLI's SSH key, the same one as `--sftp` (see **[SSH key](#ssh-key-sftp)**).

```bash
pockethost sftp              # linked instance from .pockethostconfig
pockethost sftp my-instance  # explicit instance
pockethost sftp --print      # show the sftp command without running it
```

When a project is linked, the session opens in your instance directory (`{subdomain}/`). With no linked instance, it connects at the SFTP root so you can `cd` into any instance you have access to.

The CLI runs your system's **`sftp`** client when it is on `PATH` (OpenSSH on macOS/Linux, optional Windows OpenSSH). If `sftp` is missing, it prints the full command to run manually. See **[SFTP File Access](/docs/ftp)** for client setup on every platform.

This is file access only (`ls`, `cd`, `get`, `put`, and the rest). There is no remote shell or `exec`.

## Managing instances

Everything the dashboard does to an instance has a command, using the same token as `deploy`. Commands use the linked instance unless you name one. `secrets` and `webhooks` take `-I <instance>`.

```bash
pockethost show                      # power, URLs, domain, version, settings
pockethost power on
pockethost power off --wait          # wait until it has stopped
pockethost versions
pockethost version 0.41.* --cycle
pockethost domain set api.example.com --cycle
pockethost secrets set STRIPE_KEY    # prompts for the value
pockethost webhooks add /api/cron "*/5 * * * *"
```

**Settings that need the instance off.** Renaming, changing the version or custom domain, and switching dev mode, admin sync or auto-vacuum only work while the instance is powered off, same as in the dashboard. Add `--cycle` and the CLI powers it off, waits for it to stop, applies the change and powers it back on.

**Secrets.** `secrets set KEY=value` changes only the secrets you name. Give just `KEY` to type the value at a prompt, so it stays out of your shell history. `secrets list` shows names only. Values are never sent back to the CLI. Secrets reach your instance as environment variables the next time it starts.

**Creating and deleting.** `pockethost create [name]` picks a random available name if you don't give one, and `--link` links the current folder to it. It needs a token for all instances. `pockethost delete <instance>` needs the instance powered off and asks you to type its name, unless you pass `--yes`.

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

## Authentication

The CLI signs in with a personal access token (`ph_pat_…`) only. Every command uses the first of these that is set:

1. **`POCKETHOST_TOKEN`** environment variable
2. The token saved by **`pockethost login`** (or `pockethost token set`)

Create tokens at **[Account → API Tokens](/account/tokens)**. Each token can be limited to specific instances, can be read-only, and can be revoked at any time. `list`, `link`, `show` and `logs` work with any token. `deploy`, `dev` and the [instance commands](#managing-instances) need write access, and `create` needs a token for all instances. The CLI only ever sees the instances its token can reach. For CI, see **[Deploy from CI](/docs/deploy-from-ci)**.

## How deploys work

1. The CLI collects the files matched by the include/exclude globs and hashes them.
2. It sends the list to `https://<instance>.pockethost.io`, and PocketHost replies with the files it doesn't have yet.
3. Only those files are uploaded, compressed.
4. PocketHost swaps the new file set in all at once. If anything outside `pb_public` changed, the instance is stopped for the swap and started again. Changes to `pb_public` alone go live without a restart.

`pb_data`, `.git*` files, and anything else outside `pb_*` folders, `package.json`, `bun.lock(b)`, `patches/` and `node_modules` are never touched.

PocketHost doesn't install npm packages. `package.json`, `bun.lock`, and `patches/` are copied as plain files, and the CLI ships your production `node_modules` with the deploy (see [Packages](#packages-node_modules)). A deploy without packages, from an older CLI or with `--no-node-modules`, leaves the instance's `node_modules` alone.

**Your project is the source of truth.** Files in `pb_hooks/`, `pb_migrations/`, `pb_public/`, or `patches/` on the instance that aren't in your project (or that you excluded with `-e`) are removed on deploy. If you've edited files over SFTP, run [`pockethost pull`](#start-from-whats-on-your-instance) first.

## SSH key (SFTP)

With `--sftp`, and for `pockethost sftp`, the CLI connects with an Ed25519 key it keeps in its config folder (`~/.config/pockethost/` on Linux, your OS config folder elsewhere):

- `pockethost_deploy_ed25519` (private key)
- `pockethost_deploy_ed25519.pub` (public key)

The key is created the first time you use SFTP. Tokens can't add SSH keys to your account, so add the public key under **[Account → Keys](/account/keys)** once. If it's missing, the CLI stops and prints the line to paste. Keys registered by earlier versions (**`PocketHost CLI`** or **`Phio`**) keep working.

Run `pockethost info` to see the key's fingerprint and whether it's on your account. See **[Account access keys](/blog/account-access-keys)** for keys limited to specific instances.

## How SFTP sync works (`--sftp`)

With `--sftp`, the CLI connects to:

| Setting | Value |
| ------- | ----- |
| Host | `ftp.pockethost.io` |
| Port | `2222` |
| Protocol | SFTP |
| Username | Your PocketHost email |
| Auth | The CLI's SSH key |
| Remote directory | `{instanceName}/` (instance root) |

Sync is incremental. The CLI writes `.ftp-deploy-sync-state.json` at the instance root to track what changed. Do not delete that file unless you want a full resync.

Use **`pockethost sftp`** for an interactive session with the same credentials, or see **[SFTP File Access](/docs/ftp)** for Cyberduck, FileZilla, VS Code extensions, and manual `sftp` setup.

## Environment variables

Override saved config without editing files:

| Variable | Purpose |
| -------- | ------- |
| `POCKETHOST_TOKEN` | Personal access token (CI); overrides the saved one |
| `POCKETHOST_INSTANCE_NAME` | Default instance name |
| `POCKETHOST_MOTHERSHIP_URL` | Mothership API URL (default production) |
| `POCKETHOST_HOME` | Config folder for the saved token and SSH key |
| `POCKETHOST_PROJECT_DIR` | Project folder (default: found from the current directory) |

`POCKETHOST_INSTANCE_NAME` takes precedence over `.pockethostconfig`. The older `PHIO_*` names still work with a warning.

## CI example

Create a token at **[Account → API Tokens](/account/tokens)**, save it as the `POCKETHOST_TOKEN` repository secret, and deploy:

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
          POCKETHOST_TOKEN: ${{ secrets.POCKETHOST_TOKEN }}
        run: npx pockethost@latest deploy my-instance
```

See **[Deploy from CI](/docs/deploy-from-ci)** for per-branch instances and more detail.

For GitHub Actions that already use [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action), use SFTP on port 2222 with an Ed25519 private key. FTPS on port 21 is off. See **[FTPS officially sunset](/blog/ftps-officially-sunset)**.

## Troubleshooting

### `No instance name provided and none was found in .pockethostconfig`

Run `pockethost link <instance>` in your project directory, or pass the instance name on the command line.

### `Authentication failed` or `Not authenticated`

Check `pockethost token status`. If the token was revoked or expired, create a new one at **[Account → API Tokens](/account/tokens)** and run `pockethost login` again (or update the `POCKETHOST_TOKEN` secret).

### `Instance '…' not found, or this token cannot access it`

Check the instance name, and that the token's instance list includes it.

### `This computer's SSH key isn't on your PocketHost account yet`

Add the printed public key (also in `pockethost_deploy_ed25519.pub` in the CLI's config folder) under **[Account → Keys](/account/keys)**, then run the command again. Or skip SFTP: `pockethost deploy` needs only your token.

### Permission denied (publickey) during `--sftp`

Run `pockethost info` to check that the SFTP key is on your account and that the key's instance list includes this instance.

### `Could not find 'sftp' on PATH`

Install OpenSSH client tools for your OS, or run `pockethost sftp --print` and paste the command into your preferred SFTP client. See **[SFTP File Access](/docs/ftp)**.

### `phio: command not found` or old commands

phio is now `pockethost`. See **[Upgrading from phio](#upgrading-from-phio)**.

### `Email/password login was removed in CLI 4.0`

CLI 4.0 signs in with tokens only. Run `pockethost login` once to save a token, and replace `POCKETHOST_USERNAME`/`POCKETHOST_PASSWORD` in CI with a `POCKETHOST_TOKEN` secret.

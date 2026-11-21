---
title: PocketHost CLI
description: Install the pockethost CLI (Homebrew, Scoop, the install script or from source), and use it to link a project to an instance, deploy, sync both ways with dev, pull files, read logs and restart
---

# PocketHost CLI

**`pockethost`** is the PocketHost command-line tool. Link a project folder to your instance, then deploy it, keep it in step while you work, pull files down, read the instance's logs and restart it.

`deploy` and `dev` upload over HTTPS: only the files that changed are sent, and your instance swaps them in.

## Install

`pockethost` is one executable with nothing else to install. It's a full [PocketOne](https://pocketone.dev) binary with PocketHost's commands added, so every `pocketone` command works under `pockethost` too.

**macOS or Linux**, with [Homebrew](https://brew.sh):

```bash
brew install pockethost/tap/pockethost
```

**Windows**, with [Scoop](https://scoop.sh), in PowerShell:

```powershell
scoop bucket add pockethost https://github.com/pockethost/scoop-bucket
scoop install pockethost
```

**Install script** (macOS or Linux, no Homebrew):

```bash
curl -fsSL https://pockethost.io/install.sh | sh
```

It puts `pockethost` in `/usr/local/bin` (asking for your password through `sudo` when that folder isn't yours). Set `POCKETHOST_INSTALL_DIR` to put it somewhere else, for example `curl -fsSL https://pockethost.io/install.sh | POCKETHOST_INSTALL_DIR=$HOME/.local/bin sh`. You can also download the zip for your platform from [Releases](https://github.com/pockethost/pockethost/releases) and put `pockethost` on your `PATH` yourself, or on Linux install its `.deb`, `.rpm` or `.apk` package from there.

**Build from source**, with [Go](https://go.dev) installed:

```bash
git clone https://github.com/pockethost/pockethost.git
cd pockethost/packages/pockethost-go
go build -o pockethost ./cmd/pockethost
```

Check it with `pockethost --version`. To upgrade, run `brew upgrade pockethost` or `scoop update pockethost`; otherwise `pockethost upgrade`, or run the install script again.

## Coming from the npm CLI

The `pockethost` command used to be an npm package (and before 3.0, **phio**). This binary takes its place. Remove the npm package first, so the old command doesn't come first on your `PATH`:

```bash
npm rm -g pockethost phio
```

Then install `pockethost` as above and run `pockethost link <instance URL>` in each project folder. A few things are different:

- **Linking:** `link` takes the instance's URL and saves it in `.pocketbase/remotes.json`. The old `.pockethostconfig` isn't read; you can delete it.
- **Signing in:** in your browser, with an instance superuser, or with a token passed to `link`. In CI, the token goes in `P1_TOKEN` instead of `POCKETHOST_TOKEN`.
- **`dev`** syncs both ways now, so changes made on the instance come down too.
- **Your data:** `pb_data` is never downloaded or uploaded. Use PocketBase's backups instead (see [Your data](#your-data)).
- **Instance settings** (power, versions, domains, secrets, webhooks, creating and deleting) are in the [dashboard](/dashboard).

## Quick start

```bash
pockethost link https://my-instance.pockethost.io
pockethost dev
```

1. **`pockethost link <instance URL>`**: makes the instance this folder's remote and signs you in, in your browser or with one of the instance's superusers. To use a PocketHost API token from **[Account → API Tokens](/account/tokens)** instead, pass it after the URL.
2. **`pockethost dev`**: keeps your local files and the instance in step both ways, and streams the instance's logs.

For a one-shot upload without watching:

```bash
pockethost deploy
```

## Commands

| Command                            | What it does                                                              |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `pockethost link <url> [token]`    | Make an instance this folder's remote and sign in                         |
| `pockethost clone <url> [dir]`     | Make a folder for an instance, link it and pull its code                  |
| `pockethost login [remote]`        | Sign in to a remote again                                                 |
| `pockethost logout [remote]`       | Forget the saved login                                                    |
| `pockethost deploy [remote]`       | Upload your project once                                                  |
| `pockethost dev [remote]`          | Keep your project and the instance in step both ways, and stream its logs |
| `pockethost pull [remote] [paths]` | Download the instance's code into your project                            |
| `pockethost logs [remote]`         | Stream the instance's logs                                                |
| `pockethost restart [remote]`      | Restart the instance so new migrations and packages apply                 |
| `pockethost remote list`           | List the project's remotes and whether you're signed in                   |
| `pockethost remote status`         | Show whether the instance is running, its versions and uptime             |

`[remote]` is a remote's name (`default` unless you named it with `link --name`) or an instance URL. Without it, commands use the project's default remote. Run any command with `--help` for all its flags.

Everything else about an instance (power, versions, custom domains, secrets, webhooks, settings, creating and deleting) is in the [dashboard](/dashboard).

## Linking and remotes

`pockethost link` saves the instance as one of the project's **remotes** in `.pocketbase/remotes.json`. Commit that file, so teammates and CI deploy to the same instance. Your logins are saved in your home folder, never in the project.

Link more than one instance with `--name`, and pick one by name on each command:

```bash
pockethost link https://my-app-staging.pockethost.io --name staging
pockethost deploy staging
```

`pockethost remote default <name>` changes which remote commands use when you don't name one.

To start from an instance that already has code on it, `clone` does it in one step:

```bash
pockethost clone https://my-instance.pockethost.io   # makes ./my-instance, links it, pulls its code
cd my-instance
pockethost dev
```

## Deploy

```bash
pockethost deploy
```

Sends every `pb_*` folder except `pb_data` (so `pb_hooks`, `pb_migrations`, `pb_pages`, `pb_public`), plus `package.json`, `bun.lock` or `bun.lockb`, `patches/`, and your production `node_modules` (see [Packages](#packages-nodemodules)). `pb_data`, `.git*` files and symlinks are never sent.

**Your project is the source of truth.** A deploy makes the instance's code match your project, so files on the instance that aren't in your project are removed. If a file changed on the instance since your last deploy, pull or `dev` (a migration the PocketBase admin wrote when you edited a collection, say), the deploy stops, lists those files and sends nothing. Bring them down with `pockethost pull`, then deploy again, or pass `--force` to overwrite them.

**When changes take effect.** Hooks, pages and public files take effect right away. Migrations and packages apply when the instance restarts: pass `--restart`, or run `pockethost restart` afterwards.

`deploy` accepts:

- `--dry-run`: list what would be deployed, deploy nothing
- `--out <dir>`: write the deploy set to a local folder, to inspect exactly what your instance would get
- `-v, --verbose`: list every file
- `-i, --include <patterns>` and `-e, --exclude <patterns>`: add to the default set (`pb_*`, `package.json`, `bun.lock`, `bun.lockb`, `patches/`)
- `--no-node-modules`: don't ship `node_modules`, and leave the instance's alone
- `--restart`: restart the instance after deploying when migrations or packages changed
- `--force`: deploy even when files changed on the instance, overwriting them

## Work live with `dev`

```bash
pockethost dev
```

`dev` keeps your folder and the instance in step both ways, and streams the instance's logs. Your edits go up half a second after you save. Changes made on the instance, such as the migrations the PocketBase admin writes when you edit a collection, come down within a few seconds. After you upload a migration or new packages, type `r` and Enter to restart the instance. Stop with Ctrl+C.

If a file changed on both sides, your copy wins and the instance's copy is saved in `.pocketone/conflicts/`. `dev` keeps its state in `.pocketone/`, so add that folder to `.gitignore`. To leave files out, list gitignore-style patterns in `.pocketoneignore`.

## Pull files and read logs

```bash
pockethost pull                         # pb_hooks, pb_migrations, pb_pages, pb_public, pb_templates, package.json, the lockfile, patches/
pockethost pull default pb_hooks pb_public/index.html
pockethost logs                         # the last 100 lines, then follow
```

`pull` never downloads `pb_data`. To get a copy of your data, or to bring an existing `pb_data` in, use backups in the PocketBase admin: see [Your data](#your-data).

## Packages (`node_modules`)

PocketHost doesn't install npm packages. When your project has a `package.json`, `pockethost deploy` ships your production `node_modules` instead: the packages in `dependencies` and everything they need, never `devDependencies`. Install locally first, then deploy:

```bash
bun install        # or npm install, pnpm install
pockethost deploy --restart
```

It works with npm, pnpm, Bun and workspaces. Symlinks are followed, so your instance gets plain files. Run `pockethost deploy --dry-run` to see the list. Only changed files upload, so later deploys are quick. The instance's `node_modules` ends up matching what you shipped, so a package you remove is removed there too. `--no-node-modules` leaves the instance's `node_modules` as it is.

## Your data

The CLI works with your code, never with `pb_data`. For your data, use PocketBase's backups in your instance's admin (**Settings → Backups**):

- **Download a copy:** create a backup, then download it.
- **Bring an existing `pb_data` in:** zip it, upload it as a backup, and restore it. If your settings are encrypted, add `PB_ENCRYPTION_KEY` first. See [Encrypted settings](/docs/encryption).

See [Backups and Data Protection](/docs/backup-restore) for keeping your own backups.

## Remove a migration that won't run

Delete it from `pb_migrations` in your project and deploy. The deploy removes it from the instance too:

```bash
rm pb_migrations/1700000000_bad.js
pockethost deploy --restart
```

## Signing in

`link`, `clone` and `login` sign you in to the instance:

- **In your browser**, when the instance offers it. Add `--device` to sign in on another device with a code (over SSH, say), or `--no-browser` to print the URL.
- **With one of the instance's superusers**' email and password.
- **With a PocketHost API token** from **[Account → API Tokens](/account/tokens)**: pass it after the URL (`pockethost link <url> <token>`), with `--token`, or with `--token-stdin`. Each token can be limited to specific instances, can be read-only, and can be revoked at any time. `deploy`, `dev` and `restart` need write access; `pull` and `logs` work with a read-only token.

`pockethost remote list` shows each remote and whether you're signed in. `pockethost logout` forgets a saved login.

## Deploy from CI

1. Create a token at **[Account → API Tokens](/account/tokens)** with write access to the instance.
2. Save it as a CI secret named `P1_TOKEN` (or `P1_TOKEN_STAGING` for the remote named `staging`).
3. Commit `.pocketbase/remotes.json` (from `pockethost link`), install `pockethost` in the job and deploy:

```yaml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pockethost
        run: curl -fsSL https://pockethost.io/install.sh | sh

      - name: Deploy to PocketHost
        env:
          P1_TOKEN: ${{ secrets.P1_TOKEN }}
        run: pockethost deploy --restart
```

A CI run deploys without the "changed on the instance" check, since it has no record of an earlier deploy. See **[Deploy from CI](/docs/deploy-from-ci)** for per-branch instances and more detail.

## Troubleshooting

### Not signed in

Run `pockethost login` (or `pockethost remote list` to see which remote it means). In CI, check that `P1_TOKEN` is set and that the token hasn't been revoked or expired.

### The deploy stops and lists files that changed on the instance

Someone (or the PocketBase admin) changed them since your last deploy. Run `pockethost pull` to bring them into your project, then deploy again. To overwrite them instead, pass `--force`.

### `Migrations or packages changed`

They apply when the instance restarts. Run `pockethost restart`, or deploy with `--restart`.

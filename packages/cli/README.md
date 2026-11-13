# pockethost: the PocketHost CLI

Deploy, sync, tail logs and manage your [PocketHost](https://pockethost.io) instances.

Install globally (Node.js 20+):

```bash
npm install -g pockethost
```

### Upgrading from `phio`

`phio` is now `pockethost`. Swap the package:

```bash
npm rm -g phio && npm i -g pockethost
```

Your deploy key is copied from phio's config folder (`~/.config/phio-nodejs` on Linux), `.phioconfig` is
renamed to `.pockethostconfig` (commit it), and the `PHIO_*` environment variables keep working with a warning until
you rename them to `POCKETHOST_*`.

## Commands

```bash
pockethost login [token]     # save a personal access token
pockethost token [set|clear|status]
pockethost logout
pockethost info          # alias: pockethost whoami
pockethost list          # alias: pockethost ls
pockethost link [instance]
pockethost dev [instance]
pockethost deploy [instance]
pockethost files [path]
pockethost pull [paths...]
pockethost upload <local> [remote]
pockethost rm <paths...>
pockethost sftp [instance]   # shuts down Feb 6, 2027
pockethost logs [instance]

# Instances (same as the dashboard)
pockethost show [instance]
pockethost power on|off [instance]
pockethost rename <new-name> [instance]
pockethost version <version> [instance]
pockethost versions
pockethost domain set <host> [instance]
pockethost domain clear [instance]
pockethost dev-mode on|off [instance]
pockethost admin-sync on|off [instance]
pockethost auto-vacuum on|off [instance]
pockethost secrets list|set|unset
pockethost webhooks list|add|rm
pockethost create [name]
pockethost delete <instance>
```

- **`pockethost dev`**: watch local changes and deploy them
- **`pockethost deploy`**: deploy once
- **`pockethost login`**: open Account → API Tokens and save the token you paste
- **`pockethost token`**: save, clear, or check the token
- **`pockethost files`**: list files on the instance (`-r` for everything below a folder)
- **`pockethost pull`**: download instance files into this folder (`--data` includes `pb_data`)
- **`pockethost upload`**: upload a file or folder, such as an existing `pb_data`
- **`pockethost rm`**: delete files on the instance
- **`pockethost sftp`**: interactive SFTP session. SFTP shuts down on February 6, 2027
- **`pockethost logs`**: tail instance logs

`dev` and `deploy` accept `-v/--verbose`, `-i/--include`, `-e/--exclude`, `--no-node-modules`, and `--sftp` (sync
over SFTP instead of HTTPS). `deploy` also takes `--commit <sha>`, `-m/--message <note>`, `--dry-run` (list what would
be deployed), `--out <dir>` (write the deploy set to a local folder instead of deploying) and `-y/--yes` (delete files
on the instance that aren't in your local folders without asking; without a terminal, `deploy` refuses to delete them
unless you pass it).

Default includes: `pb_*`, `package.json`, `bun.lock`, `bun.lockb`, `patches/**`.

Default excludes: `pb_data/**`.

## Managing instances

Everything the dashboard does to an instance has a command. They use the linked instance unless you name one
(`secrets` and `webhooks` take `-I <instance>`).

- **`show`**: power, URLs, domain, version, settings, secret names and webhooks (`--json` for scripts)
- **`power on|off`**: `off --wait` waits until the instance has stopped
- **`rename`**, **`version`**, **`domain set|clear`**, **`dev-mode`**, **`admin-sync`**, **`auto-vacuum`**: these need
  the instance powered off. Add `--cycle` to power it off, apply the change and power it back on in one step
- **`secrets set KEY=value…`**: changes only the secrets you name. Give just `KEY` to type the value at a prompt so it
  stays out of your shell history. `secrets list` shows names only, never values
- **`webhooks add <endpoint> "<cron>"`**, **`webhooks rm <endpoint>`**, **`webhooks list`**
- **`create [name]`**: a random available name if you don't give one. `--link` links this folder to it
- **`delete <instance>`**: the instance must be powered off. Asks you to type its name unless you pass `--yes`

## Configuration

Link a project directory to an instance:

```bash
pockethost link my-instance
```

This writes `.pockethostconfig`:

```json
{
  "instanceName": "my-instance"
}
```

Older project files (`.phioconfig`, `package.json` → `pockethost.instanceName`, `pockethost.json`) are migrated to
`.pockethostconfig` automatically on first use.

## How deploys work

`deploy` and `dev` talk to the instance over HTTPS (`https://<instance>.pockethost.io/_ph/deploy/v1`):

1. Send a manifest of `{ path: sha256 }` for the matched files.
2. Upload only the files the server is missing, as one gzip bundle per ~32 MB.
3. Commit: the server swaps the file set in atomically (stopping the instance when anything outside `pb_public`
   changes) and starts the instance again.

PocketHost doesn't run `npm install`. Instead, when your project has a `package.json`, the CLI ships your production
`node_modules` with the deploy: the packages in `dependencies` and everything they need, never `devDependencies`.
It works with npm, pnpm, Bun and workspaces, and follows symlinks, so the instance gets plain files. Install first
(`npm install` or similar), then deploy. The instance's `node_modules` ends up matching what you shipped, so packages
you remove (even the last one) are removed there too. `--no-node-modules` leaves the instance's `node_modules` alone.

Only `pb_*` folders (never `pb_data`), `package.json`, `bun.lock(b)`, `patches/` and the production `node_modules` are
deployed. Files in those folders on the instance that aren't in your project are removed. `.git*` files are never
touched.

## Authentication

The CLI signs in with a personal access token (`ph_pat_…`) only. Every command uses, in order:

1. `POCKETHOST_TOKEN`
2. the token saved by `pockethost login` (or `pockethost token set`)

Create tokens under [Account → API Tokens](https://pockethost.io/account/tokens). A token sees only the instances
you give it. You can change those instances later with the token's **Edit** button; the token itself stays the same.
`list`, `link`, `show` and `logs` work with any token. `deploy`, `dev` and the instance commands need write access,
and `create` needs a token for all instances. Email/password login was removed in 4.0.

Deploy from GitHub Actions:

```yaml
- run: npx pockethost@latest deploy myapp-${{ github.ref_name }}
  env:
    POCKETHOST_TOKEN: ${{ secrets.POCKETHOST_TOKEN }}
```

Docs: https://pockethost.io/docs/deploy-from-ci

## SSH key (`--sftp` and `pockethost sftp`)

`pockethost dev --sftp`, `pockethost deploy --sftp` and `pockethost sftp` use **SFTP** (`ftp.pockethost.io:2222`)
with an Ed25519 key stored under `POCKETHOST_HOME` (default `~/.config/pockethost/`), created on first use. Tokens
can't add SSH keys, so add the public key (`pockethost_deploy_ed25519.pub`) under
[Account → Keys](https://pockethost.io/account/keys) once; the CLI prints it if it's missing. Keys you registered
with an earlier version (`PocketHost CLI` or `Phio`) keep working. `pockethost info` shows whether the key is on your
account.

Customer docs: https://pockethost.io/docs/cli

## Environment variables

| Variable                    | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `POCKETHOST_TOKEN`          | Personal access token (CI); overrides the saved one |
| `POCKETHOST_INSTANCE_NAME`  | Override linked instance name                       |
| `POCKETHOST_MOTHERSHIP_URL` | Override mothership API URL                         |
| `POCKETHOST_HOME`           | Override config directory                           |
| `POCKETHOST_PROJECT_DIR`    | Override project root detection                     |

Environment variables take precedence over `.pockethostconfig`. The old `PHIO_*` names still work (with a deprecation
warning) and will be removed in a future major version.

## Development (monorepo)

```bash
pnpm dev:cli-client -- --help          # from the repo root, runs src/ with tsx
pnpm --filter pockethost build         # bundle to dist/cli.js
pnpm --filter pockethost test
```

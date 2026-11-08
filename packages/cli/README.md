# pockethost: the PocketHost CLI

Deploy, sync, and tail logs for your [PocketHost](https://pockethost.io) instances.

Install globally (Node.js 20+):

```bash
npm install -g pockethost
```

### Upgrading from `phio`

`phio` is now `pockethost`. Swap the package:

```bash
npm rm -g phio && npm i -g pockethost
```

Everything carries over on first run: your login and deploy key are copied from phio's config folder (`~/.config/phio-nodejs` on Linux), `.phioconfig` is
renamed to `.pockethostconfig` (commit it), and the `PHIO_*` environment variables keep working with a warning until
you rename them to `POCKETHOST_*`.

## Commands

```bash
pockethost login             # or: pockethost login --token
pockethost token [set|clear|status]
pockethost logout
pockethost info          # alias: pockethost whoami
pockethost list          # alias: pockethost ls
pockethost link [instance]
pockethost dev [instance]
pockethost deploy [instance]
pockethost sftp [instance]
pockethost logs [instance]
```

- **`pockethost dev`**: watch local changes and deploy them
- **`pockethost deploy`**: deploy once
- **`pockethost token`**: save, clear, or check a personal access token
- **`pockethost sftp`**: interactive SFTP session (uses system `sftp` when available)
- **`pockethost logs`**: tail instance logs

`dev` and `deploy` accept `-v/--verbose`, `-i/--include`, `-e/--exclude`, and `--sftp` (sync over SFTP instead of
HTTPS). `deploy` also takes `--commit <sha>` and `-m/--message <note>`.

Default includes: `pb_*`, `package.json`, `bun.lock`, `bun.lockb`, `patches/**`.

Default excludes: `pb_data/**`.

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
3. Commit: the server swaps the file set in atomically (stopping the instance when hooks, migrations or packages
   change), runs `bun install` if package files changed, and starts the instance again.

Only `pb_*` folders (never `pb_data`), `package.json`, `bun.lock(b)` and `patches/` are deployed. Files in those folders
on the instance that aren't in your project are removed. `node_modules` and `.git*` are never touched.

## Authentication

`deploy` and `dev` use, in order:

1. `POCKETHOST_TOKEN` (a personal access token, `ph_pat_…`)
2. a token saved with `pockethost token set` (or `pockethost login --token`)
3. your email/password login (`pockethost login`, or `POCKETHOST_USERNAME`/`POCKETHOST_PASSWORD`)

Create tokens under Account → API Tokens in the dashboard. Deploy from GitHub Actions:

```yaml
- run: npx pockethost@latest deploy myapp-${{ github.ref_name }}
  env:
    POCKETHOST_TOKEN: ${{ secrets.POCKETHOST_TOKEN }}
```

Docs: https://pockethost.io/docs/deploy-from-ci

## Deploy key (`--sftp` and `pockethost sftp`)

`pockethost dev --sftp`, `pockethost deploy --sftp` and `pockethost sftp` use **SFTP** (`ftp.pockethost.io:2222`) using an Ed25519 deploy key
stored under `POCKETHOST_HOME` (default `~/.config/pockethost/`). The CLI auto-registers a **`PocketHost CLI`** key
under Account → Keys on first use (an existing **`Phio`** key from phio is reused). Run `pockethost info` to inspect
key status.

Customer docs: https://pockethost.io/docs/cli

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `POCKETHOST_TOKEN` | Personal access token for `deploy`/`dev` (CI) |
| `POCKETHOST_USERNAME` | Override saved email (non-interactive login) |
| `POCKETHOST_PASSWORD` | Override saved password |
| `POCKETHOST_INSTANCE_NAME` | Override linked instance name |
| `POCKETHOST_MOTHERSHIP_URL` | Override mothership API URL |
| `POCKETHOST_HOME` | Override config directory |
| `POCKETHOST_PROJECT_DIR` | Override project root detection |

Environment variables take precedence over `.pockethostconfig`. The old `PHIO_*` names still work (with a deprecation
warning) and will be removed in the next major version.

## Development (monorepo)

```bash
pnpm dev:cli-client -- --help          # from the repo root, runs src/ with tsx
pnpm --filter pockethost build         # bundle to dist/cli.js
pnpm --filter pockethost test
```

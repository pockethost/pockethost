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
pockethost login
pockethost logout
pockethost info          # alias: pockethost whoami
pockethost list          # alias: pockethost ls
pockethost link [instance]
pockethost dev [instance]
pockethost deploy [instance]
pockethost sftp [instance]
pockethost logs [instance]
```

- **`pockethost dev`**: watch local changes and sync over SFTP
- **`pockethost deploy`**: one-shot SFTP sync
- **`pockethost sftp`**: interactive SFTP session (uses system `sftp` when available)
- **`pockethost logs`**: tail instance logs

`dev` and `deploy` accept `-v/--verbose`, `-i/--include`, and `-e/--exclude`.

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

## Deploy key

`pockethost dev` and `pockethost deploy` sync over **SFTP** (`ftp.pockethost.io:2222`) using an Ed25519 deploy key
stored under `POCKETHOST_HOME` (default `~/.config/pockethost/`). The CLI auto-registers a **`PocketHost CLI`** key
under Account → Keys on first use (an existing **`Phio`** key from phio is reused). Run `pockethost info` to inspect
key status.

Customer docs: https://pockethost.io/docs/phio

## Environment variables

| Variable | Purpose |
| -------- | ------- |
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

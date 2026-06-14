# phio: the PocketHost CLI

Install globally (Node.js 24+):

```bash
npm install -g phio
```

From the monorepo:

```bash
pnpm dev:phio -- --help
pnpm --filter phio dev -- login
```

## Commands

```bash
phio login
phio logout
phio info          # alias: phio whoami
phio list
phio link [instance]
phio dev [instance]
phio deploy [instance]
phio sftp [instance]
phio logs [instance]
```

- **`phio dev`** — watch local changes and sync over SFTP
- **`phio deploy`** — one-shot SFTP sync
- **`phio sftp`** — interactive SFTP session (uses system `sftp` when available)
- **`phio logs`** — tail instance logs

`dev` and `deploy` accept `-v/--verbose`, `-i/--include`, and `-e/--exclude`.

Default includes: `pb_*`, `package.json`, `bun.lock`, `bun.lockb`, `patches/**`.

Default excludes: `pb_data/**`.

## Configuration

Link a project directory to an instance:

```bash
phio link my-instance
```

This writes `.phioconfig`:

```json
{
  "instanceName": "my-instance"
}
```

Legacy `package.json` (`pockethost.instanceName`) and `pockethost.json` are migrated to `.phioconfig` automatically on first use.

## Deploy key

`phio dev` and `phio deploy` sync over **SFTP** (`ftp.pockethost.io:2222`) using an Ed25519 deploy key stored under `PHIO_HOME` (default `~/.config/phio/`). phio auto-registers a **`Phio`** key under Account → Keys on first use. Run `phio info` to inspect key status.

Customer docs: https://pockethost.io/docs/phio

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `PHIO_USERNAME` | Override saved email (non-interactive login) |
| `PHIO_PASSWORD` | Override saved password |
| `PHIO_INSTANCE_NAME` | Override linked instance name |
| `PHIO_MOTHERSHIP_URL` | Override mothership API URL |
| `PHIO_HOME` | Override phio config directory |

Environment variables take precedence over `.phioconfig`.

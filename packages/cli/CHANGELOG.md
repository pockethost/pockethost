# pockethost (CLI)

Formerly published as `phio`. Versions below 3.0.0 are phio's history.

## 3.1.0

### Minor Changes

- `deploy` and `dev` now upload over HTTPS instead of SFTP. The CLI sends a list of file hashes, uploads only the
  files PocketHost doesn't have yet (compressed), and PocketHost swaps the new set in all at once, restarting the
  instance when anything outside `pb_public` changed. Files in the deployed folders that aren't in your project are
  removed. Dotfiles (for example `pb_public/.well-known/`) are now deployed; `.git*` and `node_modules` stay excluded.
- Personal access tokens: set `POCKETHOST_TOKEN`, or run `pockethost token set` / `pockethost login --token`. Deploys
  need no password or SSH key, so CI works on fresh runners (previously a new runner generated a new deploy key that
  didn't match the registered `PocketHost CLI` key).
- New `pockethost token [set|clear|status]`. `info` shows the token in use. `logout` also removes a saved token.
- `deploy --commit <sha>` and `-m/--message <note>` are recorded with each deploy (`$GITHUB_SHA` is used
  automatically).
- `--sftp` on `deploy` and `dev` keeps the previous SFTP sync.
- PocketHost no longer runs `bun install` when `package.json`, `bun.lock(b)` or `patches/` change (over SFTP or the
  deploy API). Those files are copied as-is, and an existing `node_modules` on the instance is left alone. Bundle npm
  code your hooks need into `pb_hooks`.

## 3.0.0

### Major Changes

- Renamed from `phio` to `pockethost`. Install with `npm i -g pockethost`; the command is `pockethost`. The `phio`
  npm package is deprecated.
- Installs and runs on plain Node (>=20): the CLI ships as a single bundled `dist/cli.js` and no longer needs `tsx`
  on your PATH (a clean `npm i -g phio@0.4.0` failed with `/usr/bin/env: 'tsx': No such file or directory`).
- New names, migrated automatically on first run:
  - project file `.phioconfig` → `.pockethostconfig`
  - config folder `~/.config/phio-nodejs` → `~/.config/pockethost` (Linux; macOS/Windows equivalents) (login and deploy key are copied over)
  - environment variables `PHIO_*` → `POCKETHOST_*` (old names still work, with a warning)
  - new deploy keys are labeled `PocketHost CLI`; existing `Phio` keys are reused
- Removed the undocumented library entry point (`main`/`types`); the package is CLI-only.
- `list` help text now says "List your instances".

## 1.0.0 (never published; shipped as 3.0.0)

### Major Changes

- SFTP-only deploy vendor: dropped legacy FTPS/FTP codepath and `basic-ftp` dependency
- Node `>=18` (hosting stack still requires Node 24)
- Dropped `fs-extra` and `email-validator`; leaner install

## 0.4.0

### Minor Changes

- SFTP deploy and dev sync (`ftp.pockethost.io:2222`, Ed25519 key auth)
- `phio sftp` — interactive SFTP via system client (`--print` for the command line)
- Auto-provision deploy key labeled `Phio` under Account → Keys
- Project instance linking via `.phioconfig` (migrates legacy `package.json` / `pockethost.json`)
- Walk up to project root from subdirectories before sync

## 0.3.5

### Patch Changes

- Fix: add support for bun.lock

## 0.3.4

### Patch Changes

- 24988ee: Feat: logout command
- de7168b: Fix: various auth fixes
- 6262058: Fix: use correct token for log watching
- 5d28256: Enhance logs command with improved streaming and error handling

## 0.3.3

### Patch Changes

- 4bf6d1e: Fix: use client auth token instead of stored token

## 0.3.2

### Patch Changes

- b85e156: Fix: nodev22 compat

## 0.3.1

### Patch Changes

- fd128bc: Node v22 compat

## 0.3.0

### Minor Changes

- 82b4c6b: Add support for PHIO_USERNAME, PHIO_PASSWORD, and PHIO_INSTANCE_NAME env vars
- 82b4c6b: Migrate to instance names only (no IDs)
- 82b4c6b: Remove support for global instance name - local package.json or pockethost.json required now

### Patch Changes

- 1b46e08: Alphabetize instance lists
- 82b4c6b: Improved error message reporting

## 0.2.5

### Patch Changes

- 283da4e: Add 'info' command
- b17fca2: Add error handling when 'link' returns no instances
- 8aaa611: Add 'ls' alias

## 0.2.4

### Patch Changes

- Fix: --include and --exclude now parse comma separated values correctly

## 0.2.3

### Patch Changes

- Fix: bad include path

## 0.2.2

### Patch Changes

- 467c4ba: Enh: Validate auth before tailing instance logs
- 4e8ddb5: Fix: auth token now stored correctly after refresh

## 0.2.1

### Patch Changes

- Fix: Link now uses package.json

## 0.2.0

### Minor Changes

- Introduced deploy command

### Patch Changes

- Command refactoring

## 0.1.2

### Patch Changes

- Enh: add --verbose flag to dev mode

## 0.1.1

### Patch Changes

- Fix: include and exclude defaults

## 0.1.0

### Minor Changes

- afc6e91: Added `link` command to link to a specific instance
- fff79df: pockethost.io now runs `bun install` when uploading a `bun.lockb`
- 9fc57d6: Added whoami command
- 9fc57d6: Added list command
- afc6e91: Added --include and --exclude options to dev watch mode

### Patch Changes

- afc6e91: Fix: log tailer will now restart on disconnect
- fff79df: Enh: watcher now looks for package.json and bun.lockb
- fff79df: Fix: watcher was incorrectly applying --include and --exclude
- fff79df: Enh: watcher now queues successive deployments that happen in rapid succession

## 0.0.2

### Patch Changes

- Forgot tsx dep

## 0.0.1

### Patch Changes

- a5bf2f3: Initial version

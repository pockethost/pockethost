# phio

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

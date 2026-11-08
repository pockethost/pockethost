---
title: Deploy from CI
description: Deploy a PocketBase project to PocketHost from GitHub Actions or any CI with a personal access token and the pockethost CLI
---
# Deploy from CI

Point your CI at a PocketHost instance and every push deploys your `pb_hooks`, `pb_migrations`, `pb_public`, and packages. You need two things:

1. A **personal access token** stored as a CI secret named `POCKETHOST_TOKEN`.
2. A step that runs **`npx pockethost deploy <instance>`**.

No password, SSH key, or saved login is needed, so it works on fresh CI runners.

## 1. Create a token

Go to **[Account → API Tokens](/account/tokens)** and click **Create token**:

- **Name**: something you'll recognize later, like `GitHub Actions`.
- **Access**: **Deploy + read**. Read-only tokens can't deploy.
- **Instances**: pick only the instances this pipeline deploys to, or **All instances**.
- **Expiry**: 90 days is the default. You can pick 30 days, 1 year, or no expiry.

Copy the token (`ph_pat_…`) right away. PocketHost stores only a hash of it, so it is shown once.

## 2. Add it to your repository

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Name it `POCKETHOST_TOKEN` and paste the token.

## 3. Add a workflow

### Deploy `main` to one instance

```yaml
# .github/workflows/deploy.yml
name: Deploy to PocketHost
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
      - run: npx pockethost@latest deploy my-app
        env:
          POCKETHOST_TOKEN: ${{ secrets.POCKETHOST_TOKEN }}
```

### Deploy each branch to its own instance

Create one instance per branch you care about (for example `myapp-main` and `myapp-staging`), give the token access to those instances, then name the target after the branch:

```yaml
name: Deploy branch
on:
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npx pockethost@latest deploy myapp-${{ github.ref_name }}
        env:
          POCKETHOST_TOKEN: ${{ secrets.POCKETHOST_TOKEN }}
```

A push to a branch whose instance doesn't exist (or isn't in the token's scope) fails with `Instance '…' not found, or this token cannot access it.`

If your project has a `.pockethostconfig` (from `pockethost link`), you can leave off the instance name and the linked one is used.

## What a deploy does

1. The CLI hashes your project files and sends the list to your instance.
2. PocketHost replies with the files it doesn't already have, and the CLI uploads only those, compressed.
3. PocketHost swaps the new file set in all at once. When anything outside `pb_public` changed, it stops the instance for the swap and starts it again, so PocketBase never runs a half-updated set of hooks. Changes to `pb_public` alone go live without a restart.

What gets deployed:

- `pb_hooks/`, `pb_migrations/`, `pb_public/`, and other top-level `pb_*` folders
- `package.json`, `bun.lock`, `bun.lockb`, and `patches/`

What never gets touched:

- `pb_data/` (your database and uploaded files)
- `node_modules/` and `.git*` files
- anything else at the instance root

**Your project is the source of truth.** Files in `pb_hooks/`, `pb_migrations/`, `pb_public/`, or `patches/` on the instance that aren't in your project are removed on deploy. If you've edited hooks over SFTP, copy those changes into your repo before the first CI deploy.

### npm packages

PocketHost doesn't install npm packages. `package.json`, `bun.lock`, and `patches/` are copied like any other file, and a `node_modules` folder already on your instance is left alone. Most npm packages can't run inside PocketBase's JavaScript engine anyway, since it has no Node.js built-ins. If your hooks use a package that does work there, bundle it into a single file in `pb_hooks` with a bundler such as esbuild (`--bundle --format=cjs --platform=neutral`) and `require()` that file.

PocketHost used to run `bun install` automatically when `package.json` or `bun.lock` changed. It doesn't anymore. If your project relies on that (for example a PocketPages app), its current `node_modules` keeps working. To change dependencies, bundle them into `pb_hooks`, or install locally and upload `node_modules` over SFTP.

Each deploy is recorded with its time, file count, and commit SHA. The CLI sends `$GITHUB_SHA` automatically. Pass `--commit <sha>` or `-m "<note>"` to set them yourself.

## Other CI systems

Any CI that can run Node 20+ works the same way: set `POCKETHOST_TOKEN` as a secret environment variable and run `npx pockethost@latest deploy <instance>`.

## Security notes

- Scope each token to the instances it deploys. A token can't delete instances, change billing, manage SSH keys or tokens, or sign in to the dashboard.
- Revoke a token at **[Account → API Tokens](/account/tokens)**. It stops working within about 30 seconds.
- Tokens start with `ph_pat_`, which makes a leaked one easy to search for in logs and code.

## Troubleshooting

### `Authentication failed (POCKETHOST_TOKEN): Invalid or expired token.`

The token was revoked, has expired, or was pasted with a typo. Create a new one and update the secret.

### `This token is read-only.`

Create a token with **Deploy + read** access.

### `Instance '…' not found, or this token cannot access it.`

Check the instance name, and that the token's instance list includes it.

### `… is outside the deployable set`

The CLI skips files outside the folders listed above and prints a warning. To ship other files, put them under `pb_public/` or `pb_hooks/`.

---
title: Deploy from CI
description: Deploy a PocketBase project to PocketHost from GitHub Actions or any CI with an API token and the pockethost CLI
---

# Deploy from CI

Point your CI at a PocketHost instance and every push deploys your `pb_hooks`, `pb_migrations`, `pb_public`, and packages. You need two things:

1. An **API token** stored as a CI secret named `P1_TOKEN`.
2. A step that installs [`pockethost`](/docs/cli) and runs **`pockethost deploy`**.

No password, SSH key, or saved login is needed, so it works on fresh CI runners.

## 1. Create a token

Go to **[Account → API Tokens](/account/tokens)** and click **Create token**:

- **Name**: something you'll recognize later, like `GitHub Actions`.
- **Access**: **Deploy + read**. Read-only tokens can pull files and read logs, but can't deploy.
- **Instances**: pick only the instances this pipeline deploys to, or **All instances**. To change this later, create a new token and revoke the old one.
- **Expiry**: 90 days is the default. You can pick 30 days, 1 year, or no expiry.

Copy the token (`pbt_…`) right away. PocketHost stores only a hash of it, so it is shown once.

## 2. Add it to your repository

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Name it `P1_TOKEN` and paste the token.

## 3. Add a workflow

### Deploy `main` to one instance

Run `pockethost link https://my-app.pockethost.io` in your project once and commit `.pocketbase/remotes.json`, so the workflow knows which instance to deploy to:

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
      - run: curl -fsSL https://pockethost.io/install.sh | sh
      - run: pockethost deploy --restart
        env:
          P1_TOKEN: ${{ secrets.P1_TOKEN }}
```

`--restart` restarts the instance when the deploy changed migrations or packages, so they apply.

### Deploy each branch to its own instance

Create one instance per branch you care about (for example `myapp-main` and `myapp-staging`), give the token access to those instances, then deploy to the instance's URL instead of a linked remote:

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
      - run: curl -fsSL https://pockethost.io/install.sh | sh
      - run: pockethost deploy https://myapp-${{ github.ref_name }}.pockethost.io --restart
        env:
          P1_TOKEN: ${{ secrets.P1_TOKEN }}
```

A push to a branch whose instance doesn't exist, or isn't in the token's scope, fails the deploy.

To use a different token per instance, link each one under a name (`pockethost link <url> --name staging`) and set `P1_TOKEN_STAGING` for the remote named `staging`. A `P1_TOKEN_<NAME>` variable wins over `P1_TOKEN`.

## What a deploy does

1. `pockethost` hashes your project files and sends the list to your instance.
2. PocketHost replies with the files it doesn't already have, and only those are uploaded.
3. PocketHost swaps the new files in. Hooks, pages and public files take effect right away; migrations and packages apply when the instance restarts (`--restart`).

What gets deployed:

- `pb_hooks/`, `pb_migrations/`, `pb_public/`, and other top-level `pb_*` folders
- `package.json`, `bun.lock`, `bun.lockb`, and `patches/`
- your production `node_modules/`, when there's a `package.json` (see [npm packages](#npm-packages))

What never gets touched:

- `pb_data/` (your database and uploaded files)
- `.git*` files
- anything else at the instance root

**Your project is the source of truth.** A deploy makes the instance's code match your project, so files on the instance that aren't in your project are removed. If you've changed hooks on the instance directly, copy those changes into your repo before the first CI deploy (`pockethost pull` brings them down).

### npm packages

PocketHost doesn't run `npm install`. Instead, `pockethost deploy` ships your production `node_modules` when there's a `package.json`: the packages in `dependencies` and everything they need, never `devDependencies`. In CI, install before you deploy (`npm ci` or `bun install`). See [Packages](/docs/cli#packages-nodemodules).

PocketBase's JavaScript engine has no Node.js built-ins, so packages that use them (`fs`, `crypto`, `Buffer`) won't run there. Packages that only ship ES modules won't load either, since it only understands CommonJS. For one of those, bundle it into a single file in `pb_hooks` with a bundler such as esbuild (`--bundle --format=cjs --platform=neutral`) and `require()` that file.

## Other CI systems

Any CI that can run a shell works the same way: set `P1_TOKEN` as a secret environment variable, install `pockethost` with `curl -fsSL https://pockethost.io/install.sh | sh` (or download it from [Releases](https://github.com/pockethost/pockethost/releases)), and run `pockethost deploy`.

## Security notes

- Scope each token to the instances it deploys. A token can't delete instances, change billing, manage SSH keys or tokens, or sign in to the dashboard.
- Revoke a token at **[Account → API Tokens](/account/tokens)**. It stops working within about 30 seconds.
- Tokens start with `pbt_` (older ones with `ph_pat_`), which makes a leaked one easy to search for in logs and code.

## Troubleshooting

### Not signed in, or the token is refused

The token was revoked, has expired, or was pasted with a typo, or `P1_TOKEN` isn't set in the step's `env`. Create a new token and update the secret.

### The token can't deploy

Create a token with **Deploy + read** access, and check that its instance list includes the instance. To add an instance, click **Edit** on the token at **[Account → API Tokens](/account/tokens)**.

### `Migrations or packages changed`

Deploy with `--restart`, or run `pockethost restart` afterwards.

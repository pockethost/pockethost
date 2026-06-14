# Production deployment

Operator runbook for shipping the hosting stack and dashboard. For SFTP specifically, see [SFTP release](#sftp-release) below.

## Architecture

| Surface | Where it runs | How it deploys |
| ------- | ------------- | -------------- |
| Dashboard, docs, blog, Account → Keys UI | Cloudflare Pages | CI on push to `main` (`.github/workflows/publish-dashboard.yaml`) |
| Mothership (control plane) | Central node | Manual: git pull + PM2 reload |
| Edge (daemon, FTPS, SFTP, cleanup) | Per-region edge nodes | Manual: git pull + PM2 reload on each node |
| Firewall | Edge / front door | Manual: git pull + PM2 reload |

PM2 apps are defined in `ecosystem.config.cjs` at the repo root.

## Prerequisites

- Node.js 24 (`nvm install` from `.nvmrc`)
- `pnpm`, `pm2`, Docker
- `.env` configured on each host (`cp .env-template .env`)
- UFW (or equivalent): `http`, `https`, `ftp` (21), `2222/tcp` for SFTP

`setup.sh` is a reference bootstrap for a fresh Ubuntu edge node (Docker, ufw, pm2-logrotate).

## Standard hosting-stack deploy

Run on **each** edge node and the mothership host.

```bash
cd ~/pockethost   # or your clone path
git pull
pnpm install --frozen-lockfile
pnpm check:mothership-hooks   # from laptop/CI before merge; optional on server if hooks changed
pm2 reload ecosystem.config.cjs
pm2 save
```

Verify:

```bash
pm2 list
pm2 logs edge-sftp --lines 50
pm2 logs mothership --lines 50
```

`pm2-logrotate` should be online (`pm2 list`). After first install: `pm2 startup` + `pm2 save`.

## Dashboard deploy

Merge to `main`. CI builds `packages/dashboard` and runs `wrangler pages deploy`.

Manual (emergency):

```bash
pnpm install
cd packages/dashboard
pnpm build
pnpm deploy
```

## SFTP release

Ship in this order so auth and UI exist before customers connect.

### 1. Mothership (first)

Mothership must run migration `1781404800_created_ssh_keys.js` (creates `ssh_keys` collection) before SFTP auth works.

```bash
git pull && pnpm install --frozen-lockfile
pm2 reload ecosystem.config.cjs --only mothership
```

Confirm in mothership admin: **Collections → ssh_keys** exists. Check logs for migration errors.

### 2. Edge nodes (SFTP listener)

On **every** edge node that serves `ftp.pockethost.io`:

```bash
git pull && pnpm install --frozen-lockfile
ufw allow 2222/tcp   # once per host if not already open
pm2 reload ecosystem.config.cjs --only edge-sftp
```

First start generates an Ed25519 **server** host key at `$PH_HOME/ssh/host_key` (override with `PH_SFTP_HOST_KEY` in `.env`). Port defaults to `2222` (`PH_SFTP_PORT`).

Confirm log line: `SFTP server listening on port 2222`.

If `ftp.pockethost.io` load-balances across multiple edges, copy the same `host_key` file to each node or users will see rotating host-key prompts.

### 3. Dashboard (docs + Account → Keys)

Merge SFTP docs/blog/UI to `main`. CI deploys to https://pockethost.io automatically.

### 4. Smoke test

1. Log in at https://pockethost.io → **Account → Keys** → add an Ed25519 public key.
2. From a laptop:

```bash
sftp -i ~/.ssh/pockethost_ed25519 -P 2222 you@example.com@ftp.pockethost.io
```

3. `ls` at `/` should list instance subdomains the key can access.
4. `cd <subdomain>/pb_hooks` and `ls` should work while the instance is running.
5. FTPS on port 21 should still work for legacy users (`edge-ftp` unchanged).

### 5. Announce

- Blog post live: `/blog/sftp-file-access`
- Optional: Discord post linking docs at `/docs/ftp`
- FTPS login banner and sunset email remain backlog (grace period)

## Rollback

```bash
pm2 stop edge-sftp          # disables SFTP only; FTPS still on edge-ftp
pm2 reload ecosystem.config.cjs --only mothership   # only if migration caused issues
```

Dashboard rollback: redeploy a previous Cloudflare Pages deployment from the Wrangler/Pages UI.

## PocketBase version cap

To limit available PocketBase versions, set `PH_ALLOWED_POCKETBASE_SEMVER` (or legacy `MOTHERSHIP_SEMVER`) in `.env`, then restart `mothership` and run `pocketbase-update` PM2 job or `pnpm prod:cli pocketbase update`.

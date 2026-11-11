---
title: What PocketHost Adds
description: The hooks, migrations, environment variables and startup flags PocketHost adds to your PocketBase instance, and what each one does
---

# What PocketHost Adds to Your Instance

PocketHost runs the PocketBase version you choose, unmodified. To make it work well on PocketHost, it adds a few small files and settings when your instance starts. This page lists all of them.

## Hooks and migrations

These files are added to your instance each time it starts. They're read-only and don't appear in your own files, so you won't see them over the [CLI](/docs/cli) or [SFTP](/docs/ftp). They work on every PocketBase version PocketHost runs.

| File                                              | What it does                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pb_hooks/_ph_admin_sync.pb.js`                   | [Admin Sync](/docs/admin-sync). When it's on, keeps your instance's admin login the same as your PocketHost login. When it's off, it does nothing.                                                                                                |
| `pb_hooks/_ph_backup.pb.js`                       | Adds the backup route, `/api/ph/backup`, for [scheduled backups](/docs/backup-restore#schedule-backups). It only answers PocketHost's webhooks for your instance. Anyone else gets `Unauthorized`.                                                |
| `pb_hooks/_ph_lib.js`                             | Shared code for the hooks above.                                                                                                                                                                                                                  |
| `pb_migrations/1699198734_pockethost_defaults.js` | Runs once. Replaces PocketBase's placeholder settings with your instance's own: app name `Acme` becomes your instance name, the app URL becomes your instance URL, and the email sender becomes your instance name at `<instance>@pockethost.io`. |
| `pb_migrations/1794167719_pockethost_app_url.js`  | Runs once. Sets the app URL on instances that still had PocketBase's `http://localhost:8090` placeholder, so links in verification and password reset emails work.                                                                                |

The migrations only replace PocketBase's exact placeholder values. A setting you changed yourself is never touched. Like any migration, each one runs once and is recorded in PocketBase's migration history.

Avoid giving your own files these names. PocketHost's file takes the place of yours.

## Environment variables

Your hooks can read these with `$os.getenv()` or `process.env`, along with your [secrets](/docs/secrets).

| Variable          | Value                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `PH_APP_NAME`     | Your instance name.                                                                                            |
| `PH_INSTANCE_URL` | Your instance URL, such as `https://myapp.pockethost.io`.                                                      |
| `PH_APEX_DOMAIN`  | `pockethost.io`.                                                                                               |
| `PH_BACKUP_TOKEN` | The token the backup route checks. PocketHost's webhooks send it for you.                                      |
| `ADMIN_SYNC`      | Present only when Admin Sync is on. Holds your login details for Admin Sync, with the password already hashed. |
| `DEV`             | `true` when [Dev Mode](/docs/dev-mode) is on (PocketBase 0.20.1 and newer), otherwise `false`.                 |

PocketHost sets these after your secrets, so a secret with one of these names is replaced.

## How PocketBase starts

Your instance starts with:

```bash
pocketbase serve --http 0.0.0.0:8090
```

PocketHost adds only two flags, and only when you turn on the matching feature:

- `--dev` when [Dev Mode](/docs/dev-mode) is on.
- `--encryptionEnv=PB_ENCRYPTION_KEY` when you set the `PB_ENCRYPTION_KEY` secret. See [Settings Encryption](/docs/encryption).

You can't pass other flags. Flags like `--dir` or `--http` would break how PocketHost keeps instances separate.

## That's everything

Apart from the admin login Admin Sync keeps up to date and the placeholder settings above, PocketHost doesn't change your collections, records or settings. Two maintenance jobs, each documented on its own page, also touch your instance's files:

- [Auto Vacuum](/docs/auto-vacuum) compacts your database files while your instance is idle. Your data stays the same.
- Older backups [move to cold storage](/docs/backup-restore#older-backups-move-to-cold-storage), leaving a `.txt` file with a download link in their place.

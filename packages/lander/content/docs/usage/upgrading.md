---
title: Upgrading your Instance Version
category: usage
description: Learn how to upgrade your PocketHost instance version quickly and
  securely. Be it an automatic upgrade for minor updates or a manual upgrade for
  rarer and more substantial updates, our guide makes the process
  straightforward while prioritizing your project's data safety. Upgrade, but
  don't compromise.
---

PocketHost supports all versions of PocketBase.

Your instance uses [semver](https://semver.org/) version (`0.16.0`) or semver range (`~0.16.0`) to describe which version of PocketBase to run.

You may change this using the Danger Zone in the instance details.

## Automatic Upgrade Steps (most cases)

1. [Back up your instance](/docs/usage/backup-and-restore/)
2. Change to the new version you want. Typically, it is safe to use `~` in front, which will auto-upgrade any patch release. For example, if the current version of PocketBase is `0.16.5`, then specifying a semver range of `~0.16.0` will match `0.16.6` when it is released, but will not match `0.17.0` when it is released. For now, locking to the minor version is advised until PocketBase reaches v1.0.
3. Take your instance out of [maintenance mode](/docs/usage/maintenance/) so it is once again live.

## Manual Upgrade Steps (rare)

Sometimes, the automated upgrade is not possible or may leave your PocketHost instance in an unresponsive state because PocketBase exits when it notices a problem with the database schema. In that case, you must perform a manual upgrade.

1. [Back up your instance](https://pocketbase.io/docs/going-to-production/#backup-and-restore) via the PocketBase admin
2. Download your database backup via the PocketBase admin
3. On your local machine, perform whatever upgrade steps are necessary according to the PocketBase documentation
4. Perform a backup locally
5. Restore the backup via the live PocketBase admin

## Caveats

- Downgrading to an earlier version may work in some cases, but is not advised. See [#271](https://github.com/pocketbase/pocketbase/discussions/2710#discussioncomment-6185502) for further details.
- When a new version of PocketHost is run for the first time, it may run migrations on its system tables. These migrations are typically non-destructive

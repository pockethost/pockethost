---
title: Admin Sync
category: usage
description: Admin Sync keeps your instance secure by syncing your pockethost.io account with the admin account of your instance.
---

Admin Sync will make sure your instance always has an admin account that matches the login credentials of your pockethost.io account.

## Admin Sync `Enabled` (default)

When Admin Sync is enabled, your pockethost.io account credentials will be copied as an admin login to your instance before the instance is launched.

If you change your pockethost.io credentials while an instance is running, it will not be updated until the next time it is launched. To force your instance to shut down, place it in Maintenance Mode and then wait for the status to show as `idle`.

Admin Sync is enabled by default. When an instance is first created, it will have an admin account matching your pockethost.io login. This is a security measure to prevent someone from creating the initial admin account before you've had a chance.

## Admin Sync `Disabled`

Your pockethost.io credentials will not be copied to your instance on future invocations.

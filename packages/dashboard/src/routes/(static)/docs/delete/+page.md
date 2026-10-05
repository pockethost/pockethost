---
title: Deleting an Instance
description: Learn how to delete a PocketBase instance
---

# Deleting an Instance

Deleting an instance will immediately power it down and remove it from your account.

Before you can delete an instance, it must first be [powered off](/docs/power).

Once deleted, you lose access to:

- Your subdomain
- All files in `pb_data/*`
- All files in `pb_public/*`
- All files in `pb_migrations/*`
- All files in `pb_static/*`

The instance no longer appears in the dashboard and is not reachable over SFTP or HTTP.

### What PocketHost does on the edge

When the Mothership record is gone, the edge treats the on-disk folder as orphan data. A daily job moves orphans into **quarantine** under `$DATA_ROOT/quarantine/instances/` and deletes them after **30 days**. During quarantine the data is not served and is not available through your account.

That window exists for operational recovery (for example mistaken deletes). It is not a backup, and we do not guarantee recovery from it.

**PocketHost does not back up your instance data.** If you might need the data later, create a backup with PocketBase's built-in backup tools before you delete. See [Backup and Restore](/docs/backup-restore).

See [Orphan Instance Data: 30-Day Quarantine](/blog/edge-orphan-quarantine) for the full edge behavior, including self-host `--dry-run` and manual restore.

![](first-power-off.png)

![](delete-instance.png)

When you delete an instance in the dashboard, it should leave your account. For a long time, the files on disk did not always leave with it.

Failed deletes and old code paths left folders behind. They did not show up in the dashboard. They still used disk. The first cleanup pass reclaimed about **300 GB** on one node, nearly half the used space. Your live instances were not touched.

### What you should expect

Delete still works the same way. Power the instance off, then delete it. The subdomain, SFTP access, and the dashboard entry go away immediately.

PocketHost then holds the files for **30 days** and deletes them. During that window they are not served, and you cannot open them from your account. That hold is not a backup. We do not guarantee we can restore a deleted instance. If you might need the data, use PocketBase's backup tools before you delete. See [Backup and Restore](/docs/backup-restore) and [Deleting an Instance](/docs/delete).

You do not need to do anything else. The daily cleanup is on us.

### Related

This pairs with [Auto Vacuum](/blog/auto-vacuum), which reclaims empty space inside SQLite files for instances you still have, and [runtime status sync](/blog/runtime-status-sync), which keeps instance state honest across restarts.

Questions? [Discord](https://discord.gg/nVTxCMEcGT).

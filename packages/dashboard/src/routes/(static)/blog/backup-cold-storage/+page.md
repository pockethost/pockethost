PocketBase makes backups easy. Click a button, or turn on scheduled backups, and a new zip lands in `pb_data/backups`. What it doesn't do is clean up after itself unless you tell it to.

So backups pile up. Across PocketHost there are almost 5,000 backup zips taking up about 250 GB. That's more than all the file uploads on the platform. Most of that space is old backups nobody has opened in months.

Starting this week, PocketHost keeps your **most recent backup** on disk and moves the older ones to cold storage.

### What you'll see

Open the Backups list in your PocketBase admin. Your newest backup is right where you left it. Each older one is replaced by a small text file with the same name plus `.txt`:

```
pb_backup_20261101.zip      →  pb_backup_20261101.zip.txt
```

Download that text file and it tells you when the backup moved and gives you a link to download the original zip. The link works for **180 days**.

### Getting a backup back

1. Download the `.txt` file from the Backups list and open it.
2. Follow the link to download the zip.
3. In the PocketBase admin, go to **Settings > Backups**, upload the zip, and restore it.

If you click restore on the `.txt` file itself, nothing happens. It isn't a backup, so PocketBase leaves your data alone. I tested that on every PocketBase version from 0.16 to 0.41 before shipping this.

### Why only the newest one

Backups count toward your [disk storage](/blog/disk-storage), the same as your database and uploads. Keeping one backup on disk means the one you're most likely to need is always a click away. Moving the rest keeps your disk storage for your actual app.

It's also how I'm keeping PocketHost affordable. Old backups were the single biggest thing on our disks. Moving them frees up about 150 GB today.

### Want to keep every backup yourself?

Point PocketBase's backups at your own S3 bucket (Settings > Backups > S3 in the PocketBase admin). Backups stored there don't count toward your disk storage, and PocketHost doesn't touch them. See [S3 storage](/docs/s3).

The full details are on the [backup and restore](/docs/backup-restore) page and in the [Terms of Service](/terms).

Questions? [Discord](https://discord.gg/nVTxCMEcGT).

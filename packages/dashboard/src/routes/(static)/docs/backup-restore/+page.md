---
title: Backup and Restore
description: Learn how to back up and restore your PocketBase instance
---
# Backing Up and Restoring

PocketHost makes every effort to protect your data, but you should always keep your own backups. Use PocketBase's built-in backup tools (described below) to make copies you control.

PocketBase offers built-in backup and restore features, making it easy to secure your data and recover from potential issues. However, there are important considerations and alternative methods to ensure your backups are safe and reliable.

## Backup and Restore via Admin

PocketBase has a simple backup and restore feature available directly from the admin panel. You can create backups of your instance's data and restore from those backups when needed.

![](2024-10-06-15-45-55.png)

- **No need to power off**: You can perform backups and restores through the admin panel without powering off your instance, ensuring minimal disruption to your application.

However, if your instance becomes unresponsive or the admin interface is inaccessible, you may need to use alternative methods for backing up and restoring.

## Older Backups Move to Cold Storage

PocketHost keeps your **most recent backup** on disk. Once a day, older backups move to cold storage.

In the PocketBase Backups list, each moved backup is replaced by a text file with the same name plus `.txt`, for example `pb_backup_20261101.zip.txt`.

- **To get one back**: download the `.txt` file from the Backups list and open it. It contains a download link for the original zip.
- **To restore it**: download the zip from that link, then in the PocketBase admin go to **Settings > Backups**, upload the zip, and restore it.
- **How long**: moved backups are kept for **180 days**. After that they're deleted and the link stops working.
- **Restoring the `.txt` file itself does nothing.** It isn't a backup, so PocketBase leaves your data as it is.

Backups that you send to your own S3 storage aren't moved. If you want to keep every backup, [configure S3 backups](/docs/s3) in the PocketBase admin.

## Backup and Restore with the CLI

If the admin panel’s backup and restore feature is unavailable or your instance is unresponsive, you can manually back up your data with the [PocketHost CLI](/docs/cli#files). Power off the instance, then run `pockethost pull --data pb_data` to download the database and uploads. To restore, run `pockethost upload ./pb_data`. [SFTP](/docs/ftp) works too until it shuts down on February 6, 2027.

## S3 and Scheduled Backups

Automating your backups is a recommended practice, especially as your instance grows in complexity and usage. However, there are some important caveats:

- **Hibernation**: If your instance is in [hibernation](/docs/limits), automated backups may fail to execute. Waking up the instance on a schedule will not trigger any missed backup intervals. As your instance becomes busier, hibernation will become less frequent, minimizing this issue. To learn more, see [S3](/docs/s3) and [Limits](/docs/limits).

- **S3 backups**: Backing up to S3 (or another external storage solution) is highly recommended. Using S3 allows you to conserve your PocketHost storage space for critical resources such as your database and logs, which cannot be stored elsewhere. Files such as uploads and backups, on the other hand, can easily live on S3.

- **SFTP access to backups**: Note that backups stored in S3 are **not** accessible via SFTP. You will need to manage these backups directly through S3 or your chosen storage provider.

## Best Practices

To ensure your data is always secure:

1. **Regularly back up** your instance using the admin panel or automated methods like S3.
2. **Use external storage** (e.g., S3) for backups and file uploads to avoid consuming valuable PocketHost storage space.
3. If automating backups, ensure your instance is awake and running during scheduled backup intervals.
4. Keep in mind that **manual SFTP backups** are available if your instance becomes inaccessible via the admin panel.

By following these practices, you can maintain a reliable backup strategy and ensure your data is safe.

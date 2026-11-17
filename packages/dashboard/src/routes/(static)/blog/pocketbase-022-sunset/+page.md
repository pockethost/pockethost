Service update: **PocketHost is retiring PocketBase 0.22 and older on February 6, 2027**, 90 days from today. If your instances already run 0.23 or later, nothing changes for you.

Starting today, new instances and version changes need PocketBase 0.23 or later. Instances already on 0.22 or older keep running until the cutoff.

### What happens on February 6, 2027

Any instance still on 0.22 or older stops working:

- It stops answering requests.
- Its data is packed up and moved off the server. You get an email with a download link.
- The archive is kept for 180 days, then deleted.

This applies to every plan. Check the version badge next to your instance name in the dashboard. If any of your instances run 0.22 or older, a warning at the top of every dashboard page names them, with a link to each one's version page.

### I'll help you upgrade

If you need help with the upgrade, please reach out on [Discord](https://discord.gg/nVTxCMEcGT). I'm happy to help anyone. We can throw some AI at it.

### How to upgrade

PocketBase 0.23 was a big release. It migrates your database automatically when it first starts, but it rewrote the JavaScript hooks API and moved admins into a `_superusers` collection. So the risky part isn't your data. It's your code:

- **Custom `pb_hooks`** written for 0.22 or older need updating. Most changes are renames: `$app.dao()` methods move onto `$app`, `onRecordBeforeCreateRequest` becomes `onRecordCreateRequest` with `e.next()`, and route handlers get a request event instead of `c`.
- **Old `pb_migrations`** files written for 0.22 or older stop the instance from starting (`Dao is not defined`). Your schema is already in your database, so delete them, or rewrite them for 0.23 if you still need them.
- **Your frontend** should use a JS SDK made for 0.23 or later, especially if it signs in as an admin.
- If you have no `pb_hooks` and only use the SDK for records and user sign-in, the upgrade is usually just a version switch.

The safe way to do it:

1. [Back up your instance](/docs/backup-restore).
2. Create a second instance on the latest version and restore the backup into it.
3. Update your hooks, migrations and frontend against that copy until everything works.
4. Power off your real instance, [change its version](/docs/versions), deploy your updated hooks and migrations, and power it back on.

PocketBase's own [upgrade guide](https://pocketbase.io/v023upgrade/jsvm/) lists every change, with before-and-after examples.

### Why

0.23 is two years old now, and running every PocketBase version back to 0.7 means keeping two sets of hook APIs, binaries and edge cases alive. Some platform features I want to build depend on hooks that only exist in 0.23 and later.

### The timeline

- **Today**: 0.22 and older can no longer be picked for new instances or version changes. Instances on them show a warning in the dashboard.
- **December 8, 2026 and January 7, 2027**: reminder emails to anyone still on 0.22 or older.
- **February 6, 2027**: remaining 0.22-and-older instances stop working, with a download link by email.
- **180 days after archiving**: archives are deleted.

Questions? Ask on [Discord](https://discord.gg/nVTxCMEcGT) or reply to the email.

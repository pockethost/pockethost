Storage on PocketHost used to be two numbers: 250 MB of database plus 10 GB of files for each instance you pay for. That split left real questions open. Does `pb_public` count? What about backups? And what does it mean for a Flounder account with 250 instances?

So I simplified it. There's now one number: **disk storage**.

### What counts

Disk storage is everything your instances keep on PocketHost's servers. That's your databases, logs, `pb_public`, `pb_hooks`, backups, and file uploads stored locally. It's pooled across all of your instances.

| Plan | Disk storage |
|---|---|
| Pay Per PocketBase | **10 GB per paid instance** |
| Flounder, Founder, and other legacy plans | **25 GB** total |
| No paid instances | **1 GB** total |

**Files in your own S3 bucket don't count.** If your uploads or backups live in S3, they don't touch your disk storage at all. See [S3 storage](/docs/s3).

### Why legacy plans get a flat 25 GB

Flounder, Founder, and the older "unlimited" plans came with 250 or more instances. Multiply that by 10 GB and you get terabytes of storage per account. That was never the intent of those plans, and nobody is using anything close to it.

For perspective, the typical account on PocketHost uses under 50 MB. Even among paid accounts, 99% use less than about 12 GB. A flat 25 GB covers almost every legacy account with plenty of room to grow.

### `pb_public` is welcome, and it counts

Serving your frontend from `pb_public` is fine. Those files count toward your disk storage like everything else.

If you're hosting a large static site or a media library, though, a static host or CDN like Cloudflare Pages or Cloudflare R2 will usually be faster and cheaper. It also keeps your disk storage free for your data.

### PocketHost hosts PocketBase apps

I also added a line to the [Terms of Service](/terms). What you store here should be part of a PocketBase app you run on PocketHost: its database, uploads, hooks, backups, and frontend.

PocketHost isn't an object storage host. Bulk files your app doesn't use, like media mirrors, data dumps, or scraper output, belong with an object storage or static hosting provider.

### If you're over

Almost nobody is. If you are, I'll reach out first so we can work out a plan together, whether that's moving files to S3 or trimming old data.

The full details are in [Limits](/docs/limits#disk-storage).

Questions? [Discord](https://discord.gg/nVTxCMEcGT).

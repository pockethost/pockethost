# Auto-Archive Stale Free Instances

**Rule:** a free-plan instance that hasn't started in **365 days** is suspended and archived to IDrive e2. The owner gets one email with a download link. The archive is deleted from IDrive after **180 days**.

Status: implemented on branch `feat/archive-stale` (not merged, not deployed).

## Expected savings (dry run against production, 2026-11-06)

- **Local disk freed: 90.2 GB** across 10,922 instances, including suspended accounts. Another 1,329 stale instances have no local folder; they're skipped.
  - The top 9 hold about 53 GB (`blurbyt` alone is 45 GB).
  - Including suspended instances and accounts added 140 instances and 8.9 GB.
  - `--include-lapsed` (owners who used to pay) adds roughly another 10 GB.
- **IDrive: roughly 35–55 GB** (zstd -3 sample), dropping to zero as archives reach 180 days.

## How it works

### State

- **Archived:** `instances.suspension` starts with `Archived:`. The daemon already refuses to start suspended instances, and SFTP/FTP already refuse them (`fileAccessSuspension`, `a8ae09f3`).
- **Suspension history:** a new reason goes on top and earlier ones stay below it, separated by `Previously:`. So an instance suspended for fair use reads `Archived: …` followed by `Previously: <fair-use reason>`.
- **Archive object:** `PH_ARCHIVE_REMOTE/<instanceId>.tar.zst` (default `sfo-2-data:sfo-2-data/archive`). The archive date is the object's upload time.
- **No mothership schema change.** The one new row is the `instance-archived` message template, created by the first `--apply` run.

### `pockethost edge archive stale` (daily, dry run unless `--apply`)

**Archive pass**, largest instances first, up to `--max-instances` / `--max-gb`:

1. Candidates: `updated` older than `--stale-days` (365), not already archived, owner `subscription = free`, and `subscription_status` neither `active` nor (without `--include-lapsed`) `lapsed`. Skips instances with no local folder or a running container.
   - **Suspended instances and accounts are included.** Suspension doesn't exempt data from the stale rules.
   - Lapsed owners are skipped by default because billing reconciliation is still moving accounts. On 2026-11-06, 12,212 free users' records changed in one day, and at least one owner went from premium to free/lapsed.
2. Re-read the instance and skip it if it changed since the scan.
3. Push the `Archived:` reason on top of any existing suspension, wait 5 s for the mirror, and skip (put the previous suspension back) if a container started anyway.
4. `tar | zstd -3 | rclone rcat`, hashing on the way.
5. Read the object back: same byte count, same SHA-256, and `zstd -t` passes. **Any failure: put the previous suspension back, keep local data, delete the partial upload.**
6. Delete the local folder.
7. Create a `notifications` record (template `instance-archived`) with the subdomain, size, signed link and deletion date. It's sent by the mothership's existing notification hook through SES, from ben@pockethost.io.

**Expiry pass:** delete archives older than `--retention-days` (180) and push an "archive has been deleted" reason on top of the suspension history. Archives whose instance record no longer exists are deleted right away.

Ends with a log summary and, on `--apply`, a Discord post to `DISCORD_ALERT_CHANNEL_URL`.

### Download link

- The email links to `PH_ARCHIVE_LINK_ORIGIN/_ph/archive/<id>?exp=<unix>&sig=<hmac>` (default origin: the mothership host).
- The firewall checks the HMAC-SHA256 (`PH_ARCHIVE_LINK_SECRET`, falling back to `PH_SECRET`) and the expiry, then 302s to a 1-hour presigned IDrive URL (`rclone link`). Presigned S3 URLs can't last more than 7 days, hence the indirection.
- Bad signature: 403. Expired: 410. Archive gone: 404.

### `pockethost edge archive restore <instanceId>`

For support: requires an `Archived:` suspension and no local folder. It downloads and extracts the archive, then pops the archive reason off the suspension. An earlier suspension (fair use, say) comes back into force, and the command says so. Owner-level suspensions are untouched. The archive stays in IDrive until its 180 days are up.

## Files

| File                                                      | What                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/core/instanceArchive.ts`                             | Rules: candidate check, suspension text, link signing and verification (tests)                    |
| `src/core/instanceArchiveStorage.ts`                      | tar/zstd/rclone upload, verify, download, list, delete, presign (round-trip test on a local path) |
| `src/cli/commands/EdgeCommand/ArchiveCommand/`            | `edge archive stale` / `restore`, email template                                                  |
| `src/cli/commands/FirewallCommand/.../archiveDownload.ts` | Signed download route (tests), wired in `server.ts`                                               |
| `src/constants.ts`                                        | `PH_ARCHIVE_REMOTE`, `PH_ARCHIVE_LINK_SECRET`, `PH_ARCHIVE_LINK_ORIGIN`                           |
| `ecosystem.config.cjs`                                    | `edge-archive-stale`, `autostart: false`                                                          |

## Rollout

1. Merge, then restart `firewall` so the download route is live **before** any email goes out.
2. `pnpm prod:cli edge archive stale` (dry run) and review the list.
3. `pnpm prod:cli edge archive stale --apply --max-instances 9` for the 9 instances over 1 GB. Check:
   - the email arrives (it's BCC'd to `pockethost+notifications@`)
   - the link downloads
   - `edge archive restore` works on one instance
4. `pm2 start edge-archive-stale`: 200 instances/day, about a month to clear the backlog. Watch the SES bounce rate while it runs.

## Known gaps / choices

- **Unsubscribed users get no email.** The notification processor skips them (318 instances, 1.9 GB). Their instance is still archived, and they see the suspension message if they come back.
- **Unverified users get no email** (599 instances, 5.5 GB). Same outcome.
- **At 180 days, the instance record stays** (suspended, subdomain still taken). It could be deleted instead.
- **Owners with other active instances aren't excluded** (298 owners, 4.1 GB), per "if they're over the stale period, archive".
- **Suspended accounts get the archive email too**, like everyone else under the stale rules.
- **Suspended instances on paid plans are still skipped**, because the plan rule applies to everyone. This morning's snapshot had about 19 GB of stale suspended data across all plans; the free-plan part (8.9 GB) is included.
- **`instances.updated` is the staleness signal.** It also moves on any record edit, so a few long-idle instances look fresher than they are (for example `bessemer-loadboard`: last start 2025-10, record edited 2026-04). That errs on the safe side.

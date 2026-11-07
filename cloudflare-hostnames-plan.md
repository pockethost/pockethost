# Cloudflare Custom Hostname Cleanup

**Problem:** every custom domain a customer saves becomes a Cloudflare custom hostname at $0.10/month after the first 100. PocketHost only ever _adds_ them, so the count grows forever. As of 2026-11-07: 400 billed, ~290 serving, 110 dead (82 expired cert, 16 failed validation, 6 pending, 5 moved, 1 active with deleted cert). Roughly $30/month and rising.

**Goal:** Cloudflare holds a hostname only while an instance that can serve traffic owns it and the domain still points at us. The bill then tracks real usage (~290 today, likely fewer once orphans are found).

## Where the code is today

- `HandleInstanceUpdate.ts`: on a cname change, `POST custom_hostnames` for the new name. The old name is never removed. Clearing the cname (`""`) does nothing in Cloudflare.
- `HandleInstanceDelete.ts`: deletes the record. No Cloudflare call.
- Archive (`pockethost edge archive stale`) suspends instances with `Archived:`. Their hostnames stay billed.
- Account deletion / cascade deletes of instances: no Cloudflare call.
- The Cloudflare helpers live inside `HandleInstanceUpdate.ts`; nothing else can reuse them.
- `instances.cname` is the only source of truth (one domain per instance). The `domains` collection migration (`HandleMigrateCnamesToDomains`) is exported but not wired up, so it's ignored here.

## Plan

### 1. Shared Cloudflare helper (mothership)

Move `callCloudflareAPI` into `src/lib/util/cloudflare.ts` with:

- `findCustomHostname(hostname)` → `GET custom_hostnames?hostname=<name>`, returns `{ id, status, ssl.status, created_at }` or null.
- `createCustomHostname(hostname)` (existing body).
- `deleteCustomHostname(hostname)` → find, then `DELETE custom_hostnames/<id>`. No-op if not found.
- `listCustomHostnames()` → paginates (`per_page=50`) through all of them.

Look up by hostname rather than storing Cloudflare's id, so there's **no schema change**.

### 2. No record hooks

Removal is the sweep's job only. A changed or cleared cname, a deleted instance (API, admin or cascade) and an archived instance all show up as "orphan" or "archived" on the next daily run. The cost of the delay is at most a day of $0.10/month per hostname, so per-event deletes aren't worth the extra code paths.

- The existing create in `HandleInstanceUpdate` stays where it is, using the shared helper.
- Restoring an archived instance calls `createCustomHostname` if its cname is set (otherwise the customer re-saves the domain).

### 3. Daily reconcile sweep

`cronAdd('cloudflare-hostnames', '0 4 * * *', …)` in a new `handlers/cloudflare/hooks.ts`. Also runnable on demand with a dry-run flag (superuser route `POST /api/cloudflare/hostnames/sweep?apply=1`) so the first run can be reviewed.

For every Cloudflare custom hostname:

| Situation                                         | Action |
| ------------------------------------------------- | ------ |
| No instance has it as `cname` (orphan)            | delete |
| Owning instance is archived                       | delete |
| `ssl.status` expired / deleted, or status `moved` | delete |
| Validation failed / blocked                       | delete |
| Still `pending` after 14 days                     | delete |
| Active and owned by a live instance               | keep   |

And the reverse: a live instance with a cname that Cloudflare doesn't have is logged (not auto-created), so we see drift without re-adding domains that were deleted for a reason.

Deleting from Cloudflare **does not clear `instances.cname`**. The customer's setting stays; re-saving the domain in the dashboard re-registers it. The domain page already polls health, so the customer sees it's not serving.

Output a summary per run (kept / deleted by reason / drift) to the mothership log.

### 4. First run = the one-time cleanup

Instead of deleting the 110 by hand through the connector, ship steps 1 and 3, run the sweep in dry-run against production, and review the list. That also catches orphans among the ~290 "active" ones (domains still pointing at Cloudflare but no longer on any PocketHost instance), which a status-only cleanup would miss. Then run with `apply`.

If the bill needs to stop sooner, the 110 can be deleted through the connector first; the sweep will agree with that.

### 5. Dashboard copy (small)

On the domain page, when the health check fails for a saved cname, add a line: "If your domain stopped working, save it again to re-register it." Nothing else changes for customers.

## Not code

- **Budget:** Cloudflare charges have gone to the MeshEnvy card (MeshEnvy Hosting) since July; before that, PocketHost Hosting on Business Checking. Ben to decide whether to move them back.
- **Billing visibility:** the Cloudflare connector lacks billing permission, so invoice line items weren't checked. The hostname count explains the $20 alert by itself.

## Checks

- API token (`MOTHERSHIP_CLOUDFLARE_API_TOKEN`) must allow `DELETE custom_hostnames` (SSL and Certificates: Edit covers it). Verify before the first apply.
- Mothership build deploys prod: develop in a worktree.
- Docs/blog: probably a short changelog note; decide before push.

Your PocketBase app can now deploy itself on every push. Create an API token, add it as a GitHub secret, and add one step to your workflow:

```yaml
- run: npx pockethost@latest deploy my-app
  env:
    POCKETHOST_TOKEN: ${{ secrets.POCKETHOST_TOKEN }}
```

That's it. No password in CI, no SSH key, no `known_hosts` dance. Full walkthrough: **[Deploy from CI](/docs/deploy-from-ci)**.

### API tokens

Head to **[Account → API Tokens](/account/tokens)** and create one. Each token:

- can **deploy**, or only **read**
- works on **all your instances** or **just the ones you pick**
- expires after 30 days, 90 days, a year, or never
- can be revoked any time, and stops working within about 30 seconds

You see the token once, when you create it. PocketHost keeps only a hash. Tokens start with `ph_pat_`, so a leaked one is easy to search for. A token can deploy, but it can't delete instances, touch billing, manage keys or other tokens, or log in to the dashboard.

On your own machine, `pockethost token set` saves one so you never type a password either.

### Deploys got faster

`pockethost deploy` and `pockethost dev` no longer sync file by file over SFTP. The CLI now:

1. hashes your `pb_hooks`, `pb_migrations`, and `pb_public` files (plus `package.json`, `bun.lock`, and `patches/`)
2. asks your instance which of those it doesn't have yet
3. uploads only those, compressed, in one request

A deploy where you changed one hook uploads one file. A deploy where nothing changed uploads nothing.

### No more half-deployed hooks

Syncing file by file meant PocketBase could reload while half your hooks were new and half were old. Now the new files are staged first and swapped in all at once. If anything outside `pb_public` changed, PocketHost stops the instance, swaps the files, and starts it again. If only `pb_public` changed, there's no restart at all.

Your project becomes the source of truth: files in those folders that aren't in your repo are removed on deploy. `pb_data` is never touched.

### One instance per branch

Name the target after the branch and every branch gets its own PocketBase:

```yaml
- run: npx pockethost@latest deploy myapp-${{ github.ref_name }}
  env:
    POCKETHOST_TOKEN: ${{ secrets.POCKETHOST_TOKEN }}
```

Create `myapp-main` and `myapp-staging`, give the token access to both, and pushes to each branch land in the right place.

### Deploy history

Every deploy is recorded with its time, file count, and commit SHA (picked up from GitHub Actions automatically). PocketHost also keeps the files from recent deploys, which lays the groundwork for rollbacks.

### Upgrading

You need CLI **3.1.0** or newer. `npx pockethost@latest` always gets it; global installs can run `npm install -g pockethost`. Email/password login still works, and `--sftp` brings back the old sync if you need it.

Questions or rough edges? Tell me on [Discord](https://discord.gg/nVTxCMEcGT).

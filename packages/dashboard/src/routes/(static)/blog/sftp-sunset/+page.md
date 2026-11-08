Quick service update: **PocketHost is retiring SFTP file access on February 6, 2027**, 90 days from today. Your instances, data, domains and everything else keep running exactly as they do now. Only the way you move files changes.

Everything you do over SFTP now has a replacement in the [PocketHost CLI](/docs/cli), and it works with the same API token you already use to deploy.

```bash
npm install -g pockethost@latest
pockethost login
```

### What replaces what

| You do this over SFTP | Do this instead |
| --------------------- | --------------- |
| Upload hooks, migrations, `pb_public` | `pockethost deploy` (or `pockethost dev` to deploy on save) |
| Browse files | `pockethost files -r` |
| Download a copy of your instance | `pockethost pull` (add `--data` for `pb_data`) |
| Move an existing `pb_data` in | `pockethost upload ./pb_data` |
| Upload `node_modules` after adding a package | `pockethost upload node_modules` |
| Delete a migration that won't run | `pockethost rm pb_migrations/1700000000_bad.js` |
| Deploy from GitHub Actions with an FTP/SFTP action | `npx pockethost@latest deploy` with a `POCKETHOST_TOKEN` secret. See [Deploy from CI](/docs/deploy-from-ci) |

Add `-I my-instance` to any of the file commands to pick an instance, or run `pockethost link my-instance` once in your project folder. Anything under `pb_data` still needs the instance powered off first, same as SFTP.

### Moving a project that lives on SFTP

If you've been editing files straight on the server, pull them down before your first deploy:

```bash
mkdir my-app && cd my-app
pockethost link my-instance
pockethost pull
pockethost deploy
```

That order matters. `pockethost deploy` treats your local folder as the source of truth and removes files in `pb_hooks`, `pb_migrations` and `pb_public` that aren't in it. `pull` gives you a complete local copy first, so the first deploy changes nothing. Put the folder in git and you're done.

### PocketPages users

Your pages live in `pb_hooks`, so `pockethost deploy` ships them. `pockethost dev` watches your project and pushes each change as you save, which is the loop most of you had in an SFTP extension. Changes under `pb_public` go live without a restart. Anything in `pb_hooks` restarts the instance for you.

Packages are the one extra step. Deploys never touch `node_modules`, and PocketHost doesn't run `npm install` for you. When you add or upgrade a package (PocketPages itself included), install it locally and upload the folder:

```bash
npm install pocketpages@latest
pockethost upload node_modules
```

The `node_modules` already on your instance stays put until you do.

### Why

SFTP means SSH keys to manage, a separate port, a separate server process and a second way to change files that the deploy API can't see. The HTTPS deploy path uploads only what changed, swaps the whole set in at once, keeps a deploy history, and runs from any CI runner with one token. Running both forever means doing everything twice.

### The timeline

- **Today**: the file commands are live in CLI 4.1. `pockethost sftp` and `--sftp` print a notice with the date.
- **January 2027**: one more reminder by email to anyone still connecting over SFTP.
- **February 6, 2027**: SFTP is retired and port 2222 closes. SSH keys under **[Account → Keys](/account/keys)** stop doing anything, and we'll remove that page.

If you hit something SFTP did that the CLI doesn't, tell me on [Discord](https://discord.gg/nVTxCMEcGT) or reply to the email. I'd rather add a command now than find out in February.

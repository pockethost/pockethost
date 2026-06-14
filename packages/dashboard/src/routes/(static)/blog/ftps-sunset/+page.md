We shipped [SFTP file access](/blog/sftp-file-access) in June. **FTPS on port 21 is now on a sunset path.** If you still connect with explicit TLS and your PocketHost password, it is time to migrate.

### What is changing

| Today | After sunset |
| ----- | ------------ |
| SFTP on port **2222** with Ed25519 SSH keys | **The only supported protocol** |
| FTPS on port **21** with email + password | **Removed** |

SFTP is already the recommended path for Cyberduck, FileZilla, VS Code, and manual uploads. See **[SFTP File Access](/docs/ftp)** for setup.

FTPS stays available during a short grace period so you can move hooks, migrations, and CI pipelines without a fire drill. We will announce a hard removal date before we pull the plug.

### Deploy tooling (phio and GitHub Actions)

If you use **`phio deploy`**, **`phio dev`**, or [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) against `ftp.pockethost.io:21`, you are on FTPS today.

We are migrating deploy sync to **SFTP on port 2222** with the same SSH keys you register under **[Account → Keys](/account/keys)**. The virtual instance layout and `.ftp-deploy-sync-state.json` at the instance root stay the same. Only the transport changes.

Until that migration ships:

- **Manual SFTP** works now on 2222.
- **phio / FTPS deploy** still works on 21 for a limited time.

We will update phio, the docs, and CI examples when SFTP deploy is ready. Watch the blog or Discord for the all-clear.

### How to migrate today

1. Generate an Ed25519 key: `ssh-keygen -t ed25519 -f ~/.ssh/pockethost_ed25519`
2. Add the public key at **[Account → Keys](/account/keys)**.
3. Point your SFTP client at `ftp.pockethost.io:2222` with your email as the username.
4. Retire FTPS bookmarks and port-21 firewall rules.

For GitHub Actions, switch from FTPS to SFTP once we publish the updated workflow snippet in `/docs/ftp`.

### Why SFTP wins

One port. Key-based auth. No passive-mode port ranges. No certificate trust prompts every time you open Cyberduck. Same virtual filesystem and guards we built for FTPS.

We should have done this years ago. Better late than maintaining two protocols forever.

Questions about your setup? [Discord](https://discord.gg/nVTxCMEcGT).

We shipped [SFTP file access](/blog/sftp-file-access) in June. **FTPS on port 21 is now on a sunset path.** If you still connect with explicit TLS and your PocketHost password, it is time to migrate.

### What is changing

| Today | After sunset |
| ----- | ------------ |
| SFTP on port **2222** with Ed25519 SSH keys | **The only supported protocol** |
| FTPS on port **21** with email + password | **Removed** |

SFTP is already the recommended path for Cyberduck, FileZilla, VS Code, and manual uploads. See **[SFTP File Access](/docs/ftp)** for setup.

FTPS stays available during a short grace period so you can move hooks, migrations, and CI pipelines without a fire drill. We will announce a hard removal date before we pull the plug.

### Deploy tooling (phio and GitHub Actions)

**`phio deploy`** and **`phio dev`** now sync over **SFTP on port 2222** with an auto-provisioned Ed25519 deploy key. See **[phio CLI](/docs/phio)**.

If you use [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) against `ftp.pockethost.io:21`, you are still on FTPS. Migrate to SFTP on port 2222 with an Ed25519 private key, or run **`phio deploy`** in CI instead.

Until every CI pipeline moves off port 21:

- **Manual SFTP** and **phio** work on 2222.
- **FTPS deploy on 21** still works for a limited time.

The virtual instance layout and `.ftp-deploy-sync-state.json` at the instance root stay the same. Only the transport changes.

### How to migrate today

1. Generate an Ed25519 key: `ssh-keygen -t ed25519 -f ~/.ssh/pockethost_ed25519`
2. Add the public key at **[Account → Keys](/account/keys)**.
3. Point your SFTP client at `ftp.pockethost.io:2222` with your email as the username.
4. Retire FTPS bookmarks and port-21 firewall rules.

For GitHub Actions, migrate from FTPS to SFTP or use **`phio deploy`** in CI. See [/docs/phio](/docs/phio).

### Why SFTP wins

One port. Key-based auth. No passive-mode port ranges. No certificate trust prompts every time you open Cyberduck. Same virtual filesystem and guards we built for FTPS.

We should have done this years ago. Better late than maintaining two protocols forever.

Questions about your setup? [Discord](https://discord.gg/nVTxCMEcGT).

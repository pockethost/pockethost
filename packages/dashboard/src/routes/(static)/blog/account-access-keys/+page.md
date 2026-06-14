For years, the only way to give someone access to your PocketHost files was to share your account password or hand them FTPS credentials tied to your whole account. Neither option scales. Neither feels safe.

**Account access keys** fix the first half of that problem. You register Ed25519 SSH keys under **[Account → Keys](/account/keys)** and choose exactly which instances each key can reach.

Today that means **SFTP on port 2222**. It is the start of a longer roadmap for sharing account access with limited permissions.

### What you get today

Each key has:

- A **label** (for example `MacBook`, `Contractor`, `GitHub Actions`)
- An **Ed25519 public key** (paste the `ssh-ed25519 …` line from `ssh-keygen`)
- An **instance scope**: **All instances** on your account, or **Specific instances** you pick from a checklist

When someone connects over SFTP with that private key and your PocketHost email as the username, they only see instance folders they are allowed to touch. Scoped keys get a virtual root with just those subdomains. Full-account keys see every instance you own.

No password login on SFTP. Keys are the credential.

### Why this matters

This is the pattern people have asked for since we launched:

- Give a freelancer SFTP access to **one** client project without exposing the rest of your account
- Issue a CI key that can deploy to **staging** but not production
- Keep your personal laptop key on all instances while a contractor key stays on one subdomain

You stay logged in to the dashboard with your normal account. They never need your password.

### How to add a key

1. Run `ssh-keygen -t ed25519 -f ~/.ssh/pockethost_ed25519 -C "you@example.com"` (or use an existing Ed25519 key).
2. Open **[Account → Keys](/account/keys)** in the dashboard.
3. Paste the **public** key (`.pub` file), pick a label, and choose **All instances** or select specific ones.
4. Connect with SFTP using the matching **private** key. Full client steps are in **[SFTP File Access](/docs/ftp)**.

We store the public key and a fingerprint only. You keep the private key on your machine or in your secrets manager.

### What is not here yet

Be clear about the boundary. Access keys today grant **SFTP file access** scoped by instance. They do **not**:

- Log someone into the PocketHost dashboard
- Grant PocketBase admin access
- Split read vs write permissions on files
- Replace team billing or separate user accounts

Those are the next chapters. The `ssh_keys` collection and scoped virtual filesystem are the foundation we needed before any of that could work cleanly.

### Roadmap

| Phase | What | Status |
| ----- | ---- | ------ |
| Account → Keys UI, Ed25519 registration | Shipped | Done |
| Per-key instance scope on SFTP | Shipped | Done |
| SFTP deploy via scoped keys (phio, CI) | Shipped (phio) | Done |
| Dashboard/API access with limited roles | Planned | |

If you have been waiting to share hosting access without sharing everything, start with keys. Tell us what permission shape you need next on [Discord](https://discord.gg/nVTxCMEcGT).

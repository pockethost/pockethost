_[@cap'n](https://discord.gg/nVTxCMEcGT) Jun 13, 2026_

If you have ever fought FTPS passive mode, self-signed cert warnings, or `lftp` flags just to upload a hook, this one is for you.

**SFTP is now the way to manage instance files on PocketHost.** Same virtual layout (`/{your-instance}/pb_hooks`, `pb_migrations`, and the rest). Standard SSH tooling on port 2222. **FTPS is deprecated** and will go away after a grace period.

Full setup instructions for macOS, Windows, Linux, and popular clients are in **[SFTP File Access](/docs/ftp)**.

### Connect

- **Host:** `ftp.pockethost.io`
- **Port:** `2222`
- **Username:** your PocketHost email
- **Auth:** Ed25519 SSH private key (no password login on SFTP)

Create keys under **[Account → Keys](/account/keys)**. Run `ssh-keygen -t ed25519` locally and paste the public key, GitHub-style. Each key can access **all instances** or a **specific subset**. After login, instance folders at `/` are named by **subdomain**.

```bash
sftp -i ~/.ssh/pockethost_ed25519 -P 2222 you@example.com@ftp.pockethost.io
```

Cyberduck, FileZilla, WinSCP, Transmit, VS Code SFTP extensions, and JetBrains deployment all work with the same settings. See the [docs](/docs/ftp) for per-client steps.

### Why we moved on from FTPS

FTPS made sense years ago, but it is awkward in practice: passive port ranges, certificate trust prompts, and clients that treat FTP and SFTP as the same thing when they are not.

SFTP rides SSH. One port. Key-based auth. The same virtual filesystem and guards we built for FTPS (power off before `pb_data`, virtual instance root, and the rest).

### What we built

The SFTP server runs on the edge (`ssh2` in Node). We extracted a shared virtual filesystem layer so both protocols see the same instance list and folder layout while FTPS limps toward retirement.

Instance directories are created when you first open an instance over SFTP, even if the container has never run.

If you self-host PocketHost locally, `serve` starts SFTP on port 2222 alongside mothership, the edge daemon, and the firewall.

### Post-quantum warning from OpenSSH

Recent macOS and Linux clients may print:

> WARNING: connection is not using a post-quantum key exchange algorithm.

That is about **transport key exchange**, not your SSH key. Our stack uses classical Curve25519 today. Hybrid PQ KEX lands when [ssh2 PR #1471](https://github.com/mscdex/ssh2/pull/1471) merges and we ship it. No credential change on your side.

If the warning annoys you locally, `WarnWeakCrypto no` in `~/.ssh/config` for this host is fine. We would rather fix the server.

### Roadmap

| Phase                                              | What                       | Status |
| -------------------------------------------------- | -------------------------- | ------ |
| SFTP on 2222, Ed25519 keys, scoped instance access | Shipped                    | Done   |
| Docs and dashboard key UI                          | Shipped                    | Done   |
| FTPS login banner pointing at SFTP                 | Soon                       |        |
| Post-quantum hybrid KEX                            | Blocked on upstream `ssh2` |        |
| FTPS sunset (blog, email, removal)                 | After grace period         |        |

### Try it

1. Add a key at [Account → Keys](/account/keys).
2. Follow [SFTP File Access](/docs/ftp) for your OS and client.
3. Connect and `ls` at `/` to see your instances.

Questions? [Discord](https://discord.gg/nVTxCMEcGT).

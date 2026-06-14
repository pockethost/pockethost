If you use **`phio dev`** or **`phio deploy`**, you were still on FTPS. Port 21. Email and password. The same pain we have been telling everyone to leave behind.

**phio 0.4 is out.** Deploy and watch mode now sync over **SFTP on port 2222**, same as Cyberduck and the rest of your toolchain. One less reason to keep FTPS bookmarks alive.

```bash
npm install -g phio@0.4
```

Full reference: **[phio CLI](/docs/phio)**.

### What changed

**SFTP transport.** `phio dev` and `phio deploy` talk to `ftp.pockethost.io:2222` with an Ed25519 key, not FTPS on 21. Same virtual instance layout. Same incremental sync and `.ftp-deploy-sync-state.json` at the instance root. Only the wire protocol changed.

**Auto deploy key.** On first login or deploy, phio generates a local Ed25519 keypair and registers it under **[Account → Keys](/account/keys)** with the label **`Phio`**. You do not paste a public key by hand unless you want a separate CI key. Run `phio info` to see fingerprint and registration status.

**`.phioconfig`.** `phio link` now writes a small JSON file in your project root instead of stuffing `instanceName` into `package.json` or a standalone `pockethost.json`:

```json
{
  "instanceName": "my-instance"
}
```

Commit it. Old configs migrate automatically the first time you run phio in that directory.

### Quick start (new or upgrading)

```bash
npm install -g phio@0.4
phio login
phio link my-instance
phio dev
```

Watch mode pushes `pb_hooks`, `pb_migrations`, `package.json`, lockfiles, and `patches/**`. It still skips `pb_data/**`.

One-shot deploy:

```bash
phio deploy
```

CI can set `PHIO_USERNAME`, `PHIO_PASSWORD`, and `PHIO_INSTANCE_NAME` instead of interactive login. Example workflow in the [docs](/docs/phio).

### If you were on FTPS phio

Upgrade to **0.4** and run deploy again. phio handles the key and SFTP session. Retire any FTPS-specific env or firewall rules for port 21 when you are ready.

Manual SFTP clients are unchanged. See **[SFTP File Access](/docs/ftp)** and **[FTPS sunset](/blog/ftps-sunset)** for the platform timeline.

### What is next

GitHub Actions that still use [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) on port 21 need a separate migration. **`phio deploy` in CI** is the path we document today. Raw SFTP action examples land when upstream catches up.

Questions or weird deploy output after upgrading? [Discord](https://discord.gg/nVTxCMEcGT).

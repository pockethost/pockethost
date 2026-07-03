---
title: SFTP File Access
description: Access PocketBase instance files over SFTP with Ed25519 SSH keys on macOS, Windows, and Linux
---
# SFTP File Access

PocketHost provides **SFTP** access to your instance files. This replaces legacy **FTPS** (FTP over TLS on port 21) as the recommended way to upload hooks, migrations, and backups.

Authentication is **Ed25519 SSH keys only**. There is no password login on SFTP. Manage keys under **[Account → Keys](/account/keys)** in the dashboard.

> **FTPS is deprecated.** Explicit FTPS on port 21 still works with your PocketHost email and password for now, but we are sunsetting it. Use SFTP for all new setups. See the [SFTP announcement](/blog/sftp-file-access).

## Connection settings

Use these values in every client:

| Setting | Value |
| ------- | ----- |
| Protocol | **SFTP** (SSH File Transfer Protocol). Not FTP, not FTPS. |
| Host | `ftp.pockethost.io` |
| Port | `2222` |
| Username | Your PocketHost **email address** |
| Authentication | **SSH private key** (Ed25519) |
| Password | Leave blank (not used) |

Each SSH key can access **all instances** on your account or a **specific subset** you choose when creating the key.

## 1. Create an SSH key

Generate an Ed25519 key on your machine (if you do not have one yet):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/pockethost_ed25519 -C "you@example.com"
```

Set restrictive permissions on macOS and Linux:

```bash
chmod 600 ~/.ssh/pockethost_ed25519
```

Open **[Account → Keys](/account/keys)** in the dashboard:

1. Enter a **title** (for example `MacBook` or `GitHub Actions`).
2. Paste the contents of `~/.ssh/pockethost_ed25519.pub` (starts with `ssh-ed25519`).
3. Choose **all instances** or specific instances, then click **Add SSH key**.

Keep the file **without** `.pub` as your private key. PocketHost stores only the public key.

## 2. Connect from the command line

### macOS and Linux

OpenSSH ships with macOS and most Linux distributions.

One-off connection:

```bash
sftp -i ~/.ssh/pockethost_ed25519 -P 2222 you@example.com@ftp.pockethost.io
```

Add `~/.ssh/config` for a short alias:

```sshconfig
Host pockethost
  HostName ftp.pockethost.io
  Port 2222
  User you@example.com
  IdentityFile ~/.ssh/pockethost_ed25519
  IdentitiesOnly yes
```

Then connect with:

```bash
sftp pockethost
```

Upload a hook with `scp`:

```bash
scp -i ~/.ssh/pockethost_ed25519 -P 2222 ./pb_hooks/myhook.pb.js you@example.com@ftp.pockethost.io:your-instance/pb_hooks/
```

Sync a folder with `rsync` (macOS: install via Homebrew if missing):

```bash
rsync -avz -e "ssh -i ~/.ssh/pockethost_ed25519 -p 2222" ./pb_hooks/ you@example.com@ftp.pockethost.io:your-instance/pb_hooks/
```

### Windows

**Option A: OpenSSH (Windows 10/11)** — built in. Enable *Settings → Apps → Optional features → OpenSSH Client* if needed.

Save your private key to `C:\Users\YourName\.ssh\pockethost_ed25519`.

PowerShell or Command Prompt:

```powershell
sftp -i C:\Users\YourName\.ssh\pockethost_ed25519 -P 2222 you@example.com@ftp.pockethost.io
```

**Option B: PuTTY / PuTTYgen** — if your key is in OpenSSH format, use **Conversions → Import key** in PuTTYgen and save a `.ppk` file. In PuTTY: Connection → SSH → Auth → Credentials → Private key file. Host `ftp.pockethost.io`, port `2222`. PuTTY does not include SFTP file browsing; pair with **WinSCP** (see below) or use OpenSSH `sftp`.

**Option C: WSL** — use the macOS/Linux instructions inside your Linux distro.

## 3. GUI and IDE clients

All clients use the same host, port, username, and private key from [Connection settings](#connection-settings). Protocol must be **SFTP**, not FTP or FTPS.

### Cyberduck (macOS, Windows)

1. **Open Connection** → protocol **SFTP (SSH File Transfer Protocol)**.
2. Server: `ftp.pockethost.io`, Port: `2222`, Username: your email.
3. Click **SSH Private Key** and choose your private key file (`.pem` or OpenSSH format without extension).
4. Connect. You land at `/` with one folder per instance you can access.

### FileZilla (macOS, Windows, Linux)

1. **File → Site Manager → New Site**.
2. Protocol: **SFTP - SSH File Transfer Protocol**.
3. Host: `ftp.pockethost.io`, Port: `2222`, Logon Type: **Key file**.
4. User: your email. Key file: path to your private key.
5. Connect.

### WinSCP (Windows)

1. New session → **SFTP** file protocol.
2. Host: `ftp.pockethost.io`, Port: `2222`, User: your email.
3. **Advanced → SSH → Authentication** → Private key file (`.ppk` or OpenSSH; WinSCP can convert on import).
4. Save and login.

### Transmit (macOS)

1. New server → **SFTP**.
2. Address: `ftp.pockethost.io:2222`, User: your email.
3. Keys tab → import or select your private key.
4. Connect.

### VS Code

Install an SFTP extension such as [SFTP](https://marketplace.visualstudio.com/items?itemName=Natizyskunk.sftp) or [SSH FS](https://marketplace.visualstudio.com/items?itemName=Kelvin.vscode-sshfs).

Example `sftp.json` (SFTP extension) for syncing `pb_hooks`:

```json
{
  "name": "PocketHost my-instance",
  "host": "ftp.pockethost.io",
  "protocol": "sftp",
  "port": 2222,
  "username": "you@example.com",
  "privateKeyPath": "~/.ssh/pockethost_ed25519",
  "remotePath": "/my-instance/pb_hooks",
  "uploadOnSave": true
}
```

Adjust `remotePath` to your instance subdomain and folder.

### JetBrains IDEs (IntelliJ, WebStorm, etc.)

1. **Tools → Deployment → Configuration**.
2. Add **SFTP** server: `ftp.pockethost.io`, port `2222`, user = email.
3. **SSH configuration** → authentication type **Key pair**, private key file = your key.
4. Map local project folder to `/your-instance/pb_hooks` (or another path).

## Instance layout

After login you see a directory for each instance your key can access. Folder names are your instance **subdomains** (for example `harvest`), not UUIDs. `cd` into one to reach that instance's files on disk.

| Directory | Description |
| --------- | ----------- |
| `pb_hooks` | PocketBase JS hooks ([docs](https://pocketbase.io/docs/js-overview/)) |
| `pb_migrations` | Migration files ([docs](https://pocketbase.io/docs/migrations/)) |
| `pb_public` | Static public files |
| `pb_data` | Database and uploads ([docs](https://pocketbase.io/docs/going-to-production/)) |
| `pb_data/backups` | PocketBase backups |
| `pb_data/storage` | Uploaded files ([docs](https://pocketbase.io/docs/files-handling/)) |

These folders are created automatically when the instance starts or when you first connect. You may also see deploy files at the root (`package.json`, `patches/`, `.ftp-deploy-sync-state.json`, etc.) depending on your project.

**Power off** your instance before modifying `pb_data` (same rule as the dashboard). Other paths can be edited while the instance is running.

## Troubleshooting

### Permission denied (publickey)

- Confirm the public key is saved under **[Account → Keys](/account/keys)**.
- Username must be your **email**, not your instance subdomain.
- Key must be **Ed25519** (`ssh-ed25519`).
- Check the key is allowed to access the instance (all instances vs specific list).
- Point the client at the correct private key file. If OpenSSH offers the wrong key, add `IdentitiesOnly yes` under the host in `~/.ssh/config`.

### Connection refused or timeout

- Port must be **2222**, not 21 or 22.
- Host is `ftp.pockethost.io`, not `your-instance.pockethost.io`.

### Unknown host key on first connect

OpenSSH prompts to verify the server host key the first time you connect. That is expected. Type `yes` to continue, or add the host to `~/.ssh/known_hosts` via your client's trust flow. GUI clients (Cyberduck, FileZilla, WinSCP) show a similar fingerprint prompt.

### OpenSSH post-quantum warning

Recent OpenSSH clients may warn that the connection is not using a post-quantum key exchange algorithm. That refers to transport encryption, not your SSH key. It is safe to connect. We will upgrade when our SFTP stack supports hybrid PQ KEX. Details in the [SFTP blog post](/blog/sftp-file-access).

## Legacy FTPS

FTPS on port 21 (explicit TLS, email + password) remains available during the migration period. Do not use it for new projects. It will be removed after a documented sunset period.

## Automated deploy (phio and CI)

For day-to-day development, use **[phio](/docs/phio)** to link a project, watch local files, and sync over SFTP:

```bash
phio login
phio link my-instance
phio dev
```

phio manages its own Ed25519 deploy key (labeled **`Phio`** under Account → Keys). You do not need a separate key for phio unless you want scoped CI access.

For GitHub Actions, either run **`phio deploy`** with `PHIO_USERNAME` / `PHIO_PASSWORD` secrets (see [phio CLI](/docs/phio)), or migrate [SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) from FTPS on port 21 to SFTP on port 2222 with an Ed25519 private key. See **[FTPS sunset](/blog/ftps-sunset)** for the migration timeline.

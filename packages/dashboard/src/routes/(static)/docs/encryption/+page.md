---
title: Settings Encryption
description: Encrypt your PocketBase app settings with PB_ENCRYPTION_KEY, the same as --encryptionEnv on a self-hosted PocketBase
---

# Settings Encryption

PocketBase can encrypt its stored app settings, such as SMTP and S3 credentials, with a key you provide. On your own server you would run `pocketbase serve --encryptionEnv=MY_KEY`. On PocketHost, you add a [secret](/docs/secrets) named `PB_ENCRYPTION_KEY`.

When the secret is set, PocketHost starts your instance with `--encryptionEnv=PB_ENCRYPTION_KEY`. Nothing else changes.

## Turn it on

1. Make a key. PocketBase expects **32 characters**. For example:

   ```bash
   openssl rand -hex 16
   ```

2. **Save the key somewhere safe**, outside PocketHost.
3. Add a secret named `PB_ENCRYPTION_KEY` with the key as its value.
4. Restart the instance: power it off, then on. Secrets take effect the next time the instance starts.

PocketBase encrypts the settings the next time they're saved, for example when you change something under Settings in the admin UI. Settings that are already stored unencrypted keep working.

## Importing a database that's already encrypted

If you're moving a `pb_data` folder whose settings were encrypted elsewhere, add `PB_ENCRYPTION_KEY` with **the same key you used before** before you start the instance. Then upload your data over [SFTP](/docs/ftp).

## Keep the key

Your settings can only be read with the key that encrypted them. If you change or remove the secret afterwards:

- **PocketBase 0.23 and newer** won't start. The [instance logs](/docs/logs) show `invalid settings db data or missing encryption key`, or `cipher: message authentication failed` for a wrong key.
- **PocketBase 0.22 and older** start with **default settings** and log `failed to load the stored app settings - missing or invalid encryption key`. Don't save settings in the admin UI while it's like this, because that overwrites your encrypted settings with the defaults.

Either way, put the original key back and restart.

Only the settings are encrypted. Your collections, records and files are not. If the key is truly lost, you can set up your settings again, but you'll have to re-enter them.

## Key length

PocketBase uses the key for AES encryption. It also accepts 16- or 24-character keys, which give weaker encryption. Any other length makes saving the settings fail with `crypto/aes: invalid key size`, and on PocketBase 0.23+ the instance won't start. Fix the secret and restart.

## Leaving PocketHost

Take the key with you. Start your own PocketBase with the same env var and flag:

```bash
PB_ENCRYPTION_KEY=your-key ./pocketbase serve --encryptionEnv=PB_ENCRYPTION_KEY
```

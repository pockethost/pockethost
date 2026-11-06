PocketBase can encrypt its stored app settings, like SMTP and S3 credentials, with a key from an env var. Self-hosted, that's `pocketbase serve --encryptionEnv=...`. PocketHost had no way to pass that flag, so databases with encrypted settings couldn't run here.

Now they can.

### How it works

Add a [secret](/docs/secrets) named `PB_ENCRYPTION_KEY` and restart your instance. PocketHost starts PocketBase with `--encryptionEnv=PB_ENCRYPTION_KEY`, and PocketBase does the rest. There's no new setting to learn. It's the same flag and env var you'd use on your own server.

Moving in a `pb_data` folder whose settings are already encrypted? Add the secret with your existing key first, then upload over SFTP.

### Keep the key

Your settings can only be read with the key that encrypted them. If you change or remove it, PocketBase 0.23+ won't start, and older versions start with default settings. Put the key back and you're fine. Only settings are encrypted, not your records or files.

Details, including key length and leaving PocketHost, are in [Settings Encryption](/docs/encryption).

Questions? [Discord](https://discord.gg/nVTxCMEcGT).

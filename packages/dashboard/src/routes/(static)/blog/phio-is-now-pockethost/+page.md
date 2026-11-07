phio is now **`pockethost`**. Same CLI, same commands, a name you can actually guess.

```bash
npm rm -g phio
npm install -g pockethost
```

Then type `pockethost` wherever you typed `phio`. `pockethost login`, `pockethost link`, `pockethost dev`, `pockethost deploy`, `pockethost logs`. Full reference: **[PocketHost CLI](/docs/cli)**.

### Why the rename

Nobody searches npm for "phio". When people want a PocketHost CLI, they type `npm install -g pockethost`. Until now, that installed the PocketHost server itself, which is not what you want on your laptop.

So the `pockethost` package on npm is now the CLI. It starts at **3.0.0** to line up with PocketHost 3.0 and leave the old 1.x releases behind. The CLI also lives in the main PocketHost repo now instead of its own, so it ships alongside the server changes it depends on.

### Nothing to redo

The first time you run `pockethost`, it picks up everything phio had:

- **Your login and deploy key** are copied over. Your existing **`Phio`** key under **[Account → Keys](/account/keys)** keeps working, so you won't end up with a second key.
- **`.phioconfig`** becomes **`.pockethostconfig`**. Commit the new file so your teammates and CI pick it up.
- **`PHIO_*` environment variables** still work. You'll see a warning until you rename them to `POCKETHOST_*` (`PHIO_USERNAME` becomes `POCKETHOST_USERNAME`, and so on).

### Update your CI

If a GitHub Action runs `npm install -g phio`, swap it for `pockethost` and rename the env vars while you're in there:

```yaml
- name: Deploy to PocketHost
  env:
    POCKETHOST_USERNAME: ${{ secrets.POCKETHOST_EMAIL }}
    POCKETHOST_PASSWORD: ${{ secrets.POCKETHOST_PASSWORD }}
    POCKETHOST_INSTANCE_NAME: my-instance
  run: |
    npm install -g pockethost
    pockethost deploy -v
```

The CLI also runs on plain Node.js 20 or newer now. No extra tooling on your `PATH`.

The `phio` package is deprecated and won't get updates. If something doesn't carry over the way I described, tell me on [Discord](https://discord.gg/nVTxCMEcGT).

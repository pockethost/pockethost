> **Update (Nov 13, 2026):** This project was first announced as PocketBase Community Edition. It has been renamed **PocketOne** to avoid confusion with PocketBase itself.

**PocketOne** is out. It's a community fork of [PocketBase](https://pocketbase.io) that keeps PocketBase exactly as you know it, adds a small set of hooks to the core, and builds everything else as plugins. It's MIT, like PocketBase, and the code is at [github.com/pockethost/pocketone](https://github.com/pockethost/pocketone).

> **PocketOne is not affiliated with or endorsed by Gani Georgiev or the PocketBase project.** It's maintained by PocketHost and the community. For PocketBase itself, its docs and its support, go to [pocketbase.io](https://pocketbase.io).

PocketOne is run in the open, by the people who use it, with plugins anyone can contribute. There is no paid or "enterprise" PocketBase.

### What's different

PocketOne tracks upstream PocketBase closely. Its changes to the core are kept small on purpose: just the hooks plugins need to extend and override PocketBase. Every feature is a plugin under `ext/`, written against one plugin contract, so the same plugin works on a single app and on hundreds of instances in one process.

The standard binary ships with these **core extensions**. If you don't use one, it costs you nothing at runtime:

- **Point-in-time restore** (Litestream): roll your database back to any moment in the retention window, from Settings → Backups or `pocketone pitr restore`.
- **Pages** (formerly PocketPages): server-rendered pages from a `pb_pages` folder. Start one with `pocketone pages create myapp`.
- **MCP**: an endpoint at `/mcp` so agents can manage your app and call its tools.
- **Bulk Mail**: campaigns to your app's own users, with audiences from a collection, a view or SQL.
- **Auto TLS**, **API tokens**, an **OAuth server**, **S3 redirects** for file downloads, and `pocketone deploy | dev | pull | logs`.
- In dev mode (`serve --dev`), mail from an app without SMTP is caught in-process instead of going to your machine's `sendmail`. Read it at http://127.0.0.1:8025.

Beyond the core extensions there are **community plugins**. Pocker runs hundreds of PocketBase instances in one Go process, routed by hostname, with a sandbox for untrusted JS hooks. Others cover mail relay and fallback storage, and more are planned. The [README](https://github.com/pockethost/pocketone#readme) marks each one Stable, Beta, Alpha or Planned.

PocketOne has its own version numbers, starting at 0.0.1. Each release notes the upstream PocketBase version it's built on.

### Try it

On macOS or Linux with [Homebrew](https://brew.sh):

```bash
brew install pockethost/tap/pocketone
pocketone serve
```

Or download the zip for your platform from [Releases](https://github.com/pockethost/pocketone/releases). It runs your existing `pb_data`, `pb_hooks` and `pb_migrations` like the upstream PocketBase release it's built on.

### How it relates to PocketHost

PocketOne is what PocketHost's newer Go edges are built on: they serve instances with Pocker today. Features like point-in-time restore reach PocketHost through PocketOne first, and most of what we build for PocketHost becomes a PocketOne plugin anyone can use.

### Contribute

Plugins are welcome. Read [Create your own plugin](https://github.com/pockethost/pocketone/blob/main/docs/plugins.md), then open a pull request that adds `ext/<your-plugin>/` with a small `example/main.go`. Questions and ideas go in [Discord](https://discord.gg/nVTxCMEcGT).

Thanks to Gani Georgiev for PocketBase.

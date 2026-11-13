**PocketBase Community Edition** (PBCE) is out. It's a community fork of [PocketBase](https://pocketbase.io) that keeps PocketBase exactly as you know it, adds a small set of hooks to the core, and builds everything else as plugins. It's MIT, like PocketBase, and the code is at [github.com/pockethost/pocketbase](https://github.com/pockethost/pocketbase).

> **PocketBase Community Edition is not affiliated with or endorsed by Gani Georgiev or the PocketBase project.** It's maintained by PocketHost and the community. For PocketBase itself, its docs and its support, go to [pocketbase.io](https://pocketbase.io).

### Why the name

We asked the community what to call the fork, and **PocketBase Community Edition** won by an overwhelming popular vote. Before we used it, I asked Gani for permission to use the PocketBase name this way, and he gave it.

The name describes how the fork is run: in the open, by the people who use it, with plugins anyone can contribute. There is no paid or "enterprise" PocketBase.

### What's different

PBCE tracks upstream PocketBase closely. Its changes to the core are kept small on purpose: just the hooks plugins need to extend and override PocketBase. Every feature is a plugin under `ext/`, written against one plugin contract, so the same plugin works on a single app and on hundreds of instances in one process.

The standard binary ships with these **core extensions**. If you don't use one, it costs you nothing at runtime:

- **Point-in-time restore** (Litestream): roll your database back to any moment in the retention window, from Settings → Backups or `pocketbase pitr restore`.
- **Pages** (formerly PocketPages): server-rendered pages from a `pb_pages` folder. Start one with `pocketbase pages create myapp`.
- **MCP**: an endpoint at `/mcp` so agents can manage your app and call its tools.
- **Bulk Mail**: campaigns to your app's own users, with audiences from a collection, a view or SQL.
- **Auto TLS**, **API tokens**, an **OAuth server**, **S3 redirects** for file downloads, and `pocketbase deploy | dev | pull | logs`.
- In dev mode (`serve --dev`), mail from an app without SMTP is caught in-process instead of going to your machine's `sendmail`. Read it at http://127.0.0.1:8025.

Beyond the core extensions there are **community plugins**. Pocker runs hundreds of PocketBase instances in one Go process, routed by hostname, with a sandbox for untrusted JS hooks. Others cover mail relay and fallback storage, and more are planned. The [README](https://github.com/pockethost/pocketbase#readme) marks each one Stable, Beta, Alpha or Planned.

PBCE has its own version numbers, starting at 0.0.1. Each release notes the upstream PocketBase version it's built on.

### Try it

On macOS or Linux with [Homebrew](https://brew.sh):

```bash
brew install pockethost/tap/pocketbase
pocketbase serve
```

Or download the zip for your platform from [Releases](https://github.com/pockethost/pocketbase/releases). It runs your existing `pb_data`, `pb_hooks` and `pb_migrations` like the upstream PocketBase release it's built on.

### How it relates to PocketHost

PBCE is what PocketHost's newer Go edges are built on: they serve instances with Pocker today. Features like point-in-time restore reach PocketHost through PBCE first, and most of what we build for PocketHost becomes a PBCE plugin anyone can use.

### Contribute

Plugins are welcome. Read [Create your own plugin](https://github.com/pockethost/pocketbase/blob/main/docs/plugins.md), then open a pull request that adds `ext/<your-plugin>/` with a small `example/main.go`. Questions and ideas go in [Discord](https://discord.gg/nVTxCMEcGT).

Thanks to Gani for PocketBase, and for the OK on the name. And thanks to everyone who voted.

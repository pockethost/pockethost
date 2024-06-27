# PocketHost

PocketHost is the open source multi-tenant PocketBase server. PocketHost can run dozens, hundreds, even thousands of PocketBase instances on a single server or across a global cloud.

Extend PocketHost with its Plugin ecosystem. Start with the bare-bones dev server and add plugins to grow your enterprise into a global cloud.

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

## Quickstart

```
npx pockethost serve
```

## Configuration

PocketHost supports configuration by environment variable. All PocketHost environment variables begin with `PH_`.

PocketHost will search the current directory for an `.env` when it loads. Anything in `.env` will be merged with and override any `<PH_HOME>/.env` that may exist.

Use `pockethost config` to set global defaults stored in `<PH_HOME>/.env`.

### Variables

| Name           | Default                    | Discussion                                                                    |
| -------------- | -------------------------- | ----------------------------------------------------------------------------- |
| PH_HOME        | `~/.pockethost`            | PocketHost's home directory where it holds all data.                          |
| PH_APEX_DOMAIN | `pockethost.lvh.me`        | The apex domain used for routing and determining instance names.              |
| PH_PORT        | `3000`                     | The port PocketHost listens on                                                |
| PH_DEBUG       | `NODE_ENV==='development'` | Debug mode                                                                    |
| PH_PLUGINS     | (see below)                | A comma-separated list of Plugins to load                                     |
| PH_DATA_DIR    | `~/.pockethost/data`       | The root directory for storing PocketHost data, including instance databases. |
| PH_DEV         | `NODE_ENV==='development'` | Whether PocketHost is running in development mode.                            |

### Default Plugins

- `@pockethost/plugin-console-logger`
- `@pockethost/plugin-launcher-spawn`
- `@pockethost/plugin-auto-admin`

## Plugins

PocketHost uses a hook architecture and features a growing list plugins. Some plugins have a CLI component, whereas others add purely programmatic support to alter how PocketHost works:

Current plugins:

| name                  | description                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| plugin-console-logger | Routes log messages to the console                                                                |
| plugin-auto-admin     | Auto-creates a default admin account on instance launch                                           |
| plugin-launcher-spawn | Launches PocketBase instances via `spawn()` on the local machine. PocketHost uses this by default |

Coming soon:
| name | description |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| plugin-ftp-server | Used to provide secure FTPS access to PocketBase instance data. This FTP server can run along-side a PocketHost server. |
| plugin-launcher-docker | Launches PocketBase instances via Docker. This is useful for running untrusted PocketBase code and instances. pockethost.io uses this. |
| plugin-waf | A Web Application Firewall |
| plugin-waf-enforce-ssl | Enforce SSL at the
WAF

See the [./plugin-guide.md](Plugin Authoring Guide) for details about what hooks and filters are available.

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

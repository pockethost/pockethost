# PocketHost

PocketHost is the open source multi-tenant PocketBase server. PocketHost can run dozens, hundreds, even thousands of PocketBase instances on a single server or across a global cloud.

Extend PocketHost with its Plugin ecosystem. Start with the bare-bones dev server and add plugins to grow your enterprise into a global cloud.

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=2 orderedList=false} -->

<!-- code_chunk_output -->

- [Quickstart](#quickstart)
- [Introduction](#introduction)
- [The magic `serve` command](#the-magic-serve-command)
- [Configuration](#configuration)
- [Plugins Directory](#plugins-directory)
- [Writing Plugins](#writing-plugins)
- [Support](#support)

<!-- /code_chunk_output -->

---

## Quickstart

```
npx pockethost serve
```

## Introduction

PocketHost is a multitenant PocketBase hosting system. With it, you can run multiple instances of PocketBase on different subdomains, all on the same server.

Use PocketHost for development or production purposes.

PocketHost can be easily extended using its thoughtful plugin architecture. By choosing additional plugins, PocketHost's features can be extended according to your exact needs. You can even write your own plugins.

## The magic `serve` command

`pockethost serve` is a special command that can be decorated with plugins. Plugins can respond to the `serve` command by running their own services.

By convention, plugins that have some kind of `serve` functionality such as running a server, will make it available in two ways.

The first way runs ONLY the plugin's `serve` functionality:

```bash
pockethost <plugin-name> serve
```

The second way runs ALL `serve` functionality from ALL plugins:

```bash
pockethost serve
```

The exact plugins can also be narrowed:

```bash
pockethost serve --only=plugin1,plugin2,plugin3
```

See the plugin authoring guide for more information on how to make a plugin that responds to both methods.

## Configuration

PocketHost supports configuration by environment variable, `.env` file, and also built-in settings via `pockethost config`.

All PocketHost variables begin with `PH_`.

PocketHost will search the current directory for an `.env` when it loads. Anything in `.env` will be merged with and override any `<PH_HOME>/.env` that may exist.

Use `pockethost config` to list and set global defaults.

### Core Variables

See `pockethost config ls` for a full list of variables. Plugin variables will also be listed for loaded plugins.

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

## Plugins Directory

PocketHost uses an action/filter architecture to support a growing list plugins. Some plugins have a CLI component, whereas others add purely programmatic support to alter how PocketHost works.

### Core plugins

These plugins are maintained by the PocketHost project.

| Name                                           | Description                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@pockethost/plugin-console-logger`            | Routes log messages to the console                                                                                      |
| `@pockethost/plugin-auto-admin`                | Auto-creates a default admin account on instance launch                                                                 |
| `@pockethost/plugin-launcher-spawn`            | Launches PocketBase instances via `spawn()` on the local machine. PocketHost uses this by default                       |
| `@pockethost/plugin-cloudflare-request-logger` | Log additional data when running behind Cloudflare                                                                      |
| `@pockethost/plugin-ftp-server`                | Used to provide secure FTPS access to PocketBase instance data. This FTP server can run along-side a PocketHost server. |
| `@pockethost/plugin-local-auth`                | A light-weight username/password auth provider for associating instances with users.                                    |

Coming soon:
| name | description |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| plugin-launcher-docker | Launches PocketBase instances via Docker. This is useful for running untrusted PocketBase code and instances. pockethost.io uses this. |
| plugin-waf | A Web Application Firewall |
| plugin-waf-enforce-ssl | Enforce SSL at the WAF

## Writing Plugins

See the [Plugin Authoring Guide](https://github.com/pockethost/pockethost/blob/master/packages/pockethost/plugin-guide.md) for details about how to write your own plugins.

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

# plugin-maildev

A plugin for [pockethost](https://www.npmjs.com/package/pockethost).

`maildev` starts a local SMTP sever via the `maildev` NPM package. By default, all instances are configured to use the local SMTP server when they launch.

## Quickstart

```bash
npx pockethost plugin install @pockethost/plugin-maildev

npx pockethost maildev --help
```

## Variables

The following variables will be used if they are found in the shell environment. PocketHost will also load them from an `.env` file if found at load time.

| Name                        | Default                      | Discussion                                                                              |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| PH_MAILDEV_HOME             | `.pockethost/plugin-maildev` | The home directory for any data storage needs of this plugin.                           |
| PH_MAILDEV_ALWAYS_USE_LOCAL | `true`                       | When a PocketBase instance launches, it will be configured to use the local SMTP setup. |

## Actions

## Filters

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

# plugin-auto-admin

Automatically create an admin user for the PocketBase instance if one doesn't already exist.

A plugin for [pockethost](https://www.npmjs.com/package/pockethost).

## Quickstart

```bash
npx pockethost plugin install @pockethost/plugin-auto-admin

npx pockethost auto-admin --help
```

## Variables

The following variables will be used if they are found in the shell environment. PocketHost will also load them from an `.env` file if found at load time.

| Name                   | Default                         | Discussion                                                    |
| ---------------------- | ------------------------------- | ------------------------------------------------------------- |
| PH_AUTO_ADMIN_HOME     | `.pockethost/plugin-auto-admin` | The home directory for any data storage needs of this plugin. |
| PH_AUTO_ADMIN_LOGIN    | `admin@pockethost.io`           | The admin login to use when creating an admin account.        |
| PH_AUTO_ADMIN_PASSWORD | `password`                      | The admin password to use when creating an admin account.     |

## Actions

## Filters

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

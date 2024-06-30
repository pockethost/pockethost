# plugin-local-auth

A plugin for [pockethost](https://www.npmjs.com/package/pockethost).

This plugin implements a local user auth database.

## Quickstart

**Install**

```bash
npx pockethost plugin install @pockethost/plugin-local-auth
```

**Get help**

```bash
npx pockethost local-auth --help
```

**Create user/admin**

```bash
npx pockethost local-auth create foo@bar.com myPassword
npx pockethost local-auth create admin@bar.com myPassword --admin
```

**Delete user**

```bash
npx pockethost local-auth delete foo@bar.com
```

**List users**

```bash
npx pockethost local-auth ls
```

## Variables

The following variables will be used if they are found in the shell environment. PocketHost will also load them from an `.env` file if found at load time.

| Name               | Default                         | Discussion                                                    |
| ------------------ | ------------------------------- | ------------------------------------------------------------- |
| PH_LOCAL_AUTH_HOME | `.pockethost/plugin-local-auth` | The home directory for any data storage needs of this plugin. |

## Actions

## Filters

## Related Plugins

`local-auth` pairs well with:

- `@pockethost/plugin-ftp-server`
- `@pockethost/plugin-auto-admin`

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

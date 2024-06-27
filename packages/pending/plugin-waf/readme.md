# plugin-waf

A Web Application Firewall for PocketHost.

This plugin adds WAF support to PocketHost. Use it to run a WAF server that understands the rest of your PocketHost configuration and how to direct traffic appropriately. WAF can also be extended with other WAF-aware plugins to add rules like rate limiting and IP whitelisting.

pockethost.io uses WAF extensively to add a security layer in front of PocketHost origin servers.

## Quickstart

```
npx pockethost install @pockethost/plugin-waf

npx pockethost waf --help
```

## Discussion

By itself, WAF functions primarily as a reverse proxy. When WAF is enabled, PocketHost plugins that run servers should listen for the `Waf_VHosts` filter and add their route.

## Actions

### Waf_OnAppMiddleware (`waf_on_app_middleware`)

```ts
import { type Express, type PocketHostAction } from 'pockethost/core'

registerAction(PocketHostAction.Waf_OnAppMiddleware, (app: Express) => {
  app.use((req) => {
    console.log(req.host)
  })
})
```

### Waf_OnRequestError (`waf_on_request_error`)

## Filters

### Waf_VHosts(`waf_vhosts`)

```ts
import { type PocketHostFilter } from 'pockethost/core'

registerFilter(
  PocketHostFilter.Waf_HostnameRoutes,
  async (routes: { [_: string]: string }) => {
    return { ...routes, '*': `http://localhost:${DAEMON_PORT()}` }
  },
  99,
)
```

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

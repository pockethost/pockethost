# plugin-launcher-spawn

A `spawn()`-based PocketBase launcher plugin for [pockethost](https://www.npmjs.com/package/pockethost).

This plugin will listen for incoming request events and respond by launching the requested PocketBase version using `spawn()`. Note that `spawn()` should only be used in trusted environments such as development environments or homogeneous servers where all PocketBase instances are under your complete control.

## Quickstart

```bash
npx pockethost plugin install @pockethost/plugin-launcher-spawn
```

Note: this plugin is installed by default.

## Events

| Name                              | Discussion |
| --------------------------------- | ---------- |
| doInstanceLogAction               |            |
| onAfterServerStartAction          |            |
| onGetOrProvisionInstanceUrlFilter |            |
| onNewInstanceRecordFilter         |            |

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

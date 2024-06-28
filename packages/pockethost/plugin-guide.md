# PocketHost Plugin Authoring Guide

## Introduction

PocketHost features a plugin architecture where various hooks and events are exposed throughout the lifecycle of the server and PocketBase instances.

A core set of hooks are available, and plugins are also allowed to introduce their own hooks.

_Action_ hooks have side effects and are executed in any order. When an action is fired, it will await all handlers. Think of a `map` operation.

_Filter_ hooks should have no side effects and return a single value. Think of a `reduce` operation.

All hooks follow a specific naming convention:

`do<xxx>Action`/`do<xxx>Filter` - Execute an action or filter, optionally with context.

Example:

```ts
const url = await doGetOrProvisionInstanceUrlFilter('', {
  req,
  res,
  instance,
  host,
  subdomain,
})
```

`on<xxx>Action`/`on<xxx>Filter` - Listen for an action or filter.

Example:

```ts
onLogAction(async ({ currentLevel, levelIn, args }) => {
  console.log(...args)
})
```

## Creating a plugin

A plugin is an npm package. Run `pockethost plugin create <my-plugin-name>` to create a new plugin in the current directory. From there, use `import { onLogAction } from 'pockethost/core` to import hooks. Define your own with `createCustomFilter`/`createCustomFilterWithContext` and `createCustomAction`/`createCustomActionWithContext`.

## Core Actions

| Name                  | Description                                    | Context                         | Example                                                                                                                                            | Since |
| --------------------- | ---------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BeforeInstanceStarted | An instance will start                         | instance                        | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L215) | 1.3.0 |
| AfterInstanceStarted  | An instance has started                        | instance, url                   | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L215) | 1.3.0 |
| AfterInstanceStopped  | An instance has stopped                        | instance, url                   | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L199) | 1.3.0 |
| InstanceLog           | A log action                                   | logLevel, currentLogLevel, args | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L147) | 1.3.0 |
| Serve                 | The `pockethost serve` command has been called | only[]                          |                                                                                                                                                    | 1.4.0 |
| 1.4.0                 |

## Core Filters

### ServerSlugs (since 1.4.0)

The items available to the `--only` switch of `pockethost serve`. `--only` controls which services should respond to the `Serve` action.

```ts
const slugs = await doServeSlugsFilter([])
```

```ts
onServeSlugsFilter(async (slugs) => {
  return [...slugs, 'maildev']
})
```

### InstanceConfig (since 1.5.0)

Configure instance `env` and `binds` before launch.

```ts
const config = await doInstanceConfigFilter({
  env: {},
  binds: {
    data: [],
    hooks: [],
    migrations: [],
    public: [],
  },
})
```

```ts
import { produce } from 'immer'
onInstanceConfigFilter(async (config) => {
  return produce(config, (draft) => {
    draft.binds.hooks.push({
      src: PH_PROJECT_DIR(`src/instance-app/hooks/**/*`),
      base: PH_PROJECT_DIR(`src/instance-app/hooks`),
    })
  })
})
```

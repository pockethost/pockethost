# PocketHost Plugin Authoring Guide

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [Introduction](#introduction)
- [Creating a basic plugin](#creating-a-basic-plugin)
- [Plugin Events Lifecycle](#plugin-events-lifecycle)
- [PocketBase JS Hooks and Migrations](#pocketbase-js-hooks-and-migrations)
- [Extending the PocketHost CLI](#extending-the-pockethost-cli)
- [Reference](#reference)
  - [Core Actions](#core-actions)
  - [Core Filters](#core-filters)
    - [ServerSlugs (since 1.4.0)](#serverslugs-since-140)
    - [InstanceConfig (since 1.5.0)](#instanceconfig-since-150)

<!-- /code_chunk_output -->

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

## Creating a basic plugin

A plugin is an npm package.

Use PocketHost to generate a Typescript plugin starter, and follow that code.

```bash
pockethost plugin create <my-plugin-name>
```

## Plugin Events Lifecycle

PocketHost executes many actions and filters that your plugin can access to add, extend, and enhance various features.

## PocketBase JS Hooks and Migrations

PocketHost does not delete leftover hook and migration files when the plugin is not present. Write hooks so they won't run if the plugin is disabled. The easiest way is to add this to your hooks:

```js
$app.onXXXX(() => {
  // Perform this check inside any hook
  const isEnabled = $os.getenv('PH_<PLUGIN_NAME>_ENABLED')
  if (!isEnabled) return
})
```

## Extending the PocketHost CLI

```ts
import { Command } from 'commander'

// Create some operation that you want to run via CLI
const myCmd = async () => {
  console.log(`Do something`)
}

// Add the command. By convention, create a top-level
// command named after your plugin, then add sub-commands.
onCliCommandsFilter(async (commands) => {
  return [
    ...commands,
    new Command(`my-plugin`).description(`my-plugin commands`).addCommand(
      new Command(`serve`).description(`Run a task`).action(async (options) => {
        myCmd()
      }),
    ),
  ]
})

/**
 * The following two hooks make it possible to run one or more of your custom
 * commands when the standard `pockethost serve` is called
 */

// Register a unique slug (your plugin name)
onServeSlugsFilter(async (slugs) => {
  return [...slugs, 'my-plugin']
})

// When the Serve action fires, check to see if
// your command is one of the commands the user
// specified (true by default)
onServeAction(async ({ only }) => {
  if (!only.includes('my-plugin')) return
  myCmd()
})
```

## Reference

### Core Actions

| Name                  | Description                                    | Context                         | Example                                                                                                                                            | Since |
| --------------------- | ---------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BeforeInstanceStarted | An instance will start                         | instance                        | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L215) | 1.3.0 |
| AfterInstanceStarted  | An instance has started                        | instance, url                   | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L215) | 1.3.0 |
| AfterInstanceStopped  | An instance has stopped                        | instance, url                   | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L199) | 1.3.0 |
| InstanceLog           | A log action                                   | logLevel, currentLogLevel, args | [example](https://github.com/pockethost/pockethost/blob/e6355c1aea2484ffba9d95110faa2af40e922855/packages/plugin-launcher-spawn/src/index.ts#L147) | 1.3.0 |
| Serve                 | The `pockethost serve` command has been called | only[]                          |                                                                                                                                                    | 1.4.0 |

#### AfterPluginsLoaded (since 1.6.0)

Fired after all plugins have been loaded. This is a good time to perform initialization that may depend upon other plugins.

#### KillInstance (since 1.6.0)

```ts
await doKillInstanceAction({ instance })
```

### Core Filters

#### ServerSlugs (since 1.4.0)

The items available to the `--only` switch of `pockethost serve`. `--only` controls which services should respond to the `Serve` action.

```ts
const slugs = await doServeSlugsFilter([])
```

```ts
onServeSlugsFilter(async (slugs) => {
  return [...slugs, 'maildev']
})
```

#### InstanceConfig (since 1.5.0)

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

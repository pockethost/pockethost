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

## Core Filters

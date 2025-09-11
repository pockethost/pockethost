---
title: Instance Details
description: Learn how to manage your PocketHost instance with our comprehensive
  guide, covering on-demand execution, usage metering, versioning, secrets, and
  admin access.
---

PocketHost provides a simple dashboard where you can manage your instance.

## On-demand Execution

PocketHost runs your PocketBase instance on-demand. That means PocketHost waits for a web request to hit PocketBase before it actually launches PocketBase and responds. This means that your instance can run on huge, beefy hardware that would be prohibitively expensive to run on your own. We can afford to do this for you because the hardware is shared with other on-demand instances.

Instances are placed in hibernation after 5 seconds of idle time.

![View of an instance in the Idle state](/docs/instance-idle-screenshot.png)

> Note: There is a slight "first hit" penalty if PocketHost needs to spin up your idle instance before responding to a request. In practice, this is not noticeable to most users for most applications. It's nearly indistinguishable from normal network delays.

## Usage Metering

_Note: Usage Metering is not active until PocketHost reaches v1.0. There is no planned timeline for when or if PocketHost will reach v1.0_

## Instance Versioning

By default, your instance will use the latest major+minor release of PocketBase. The PocketBase version is locked when your instance is created. We use [semver](https://semver.org/) ([npm package](https://docs.npmjs.com/cli/v6/using-npm/semver)) to determine the version range that should be allowed for your instance. When your instance is launched, it will use the latest matching version.

![View of an instance showing the which version of PocketBase it is running](/docs/instance-version-screenshot.png)

For example, if the latest version of PocketBase is `0.10.4`, your instance will automatically run with `~0.10.4`, meaning that `major=0` and `minor=10` are locked, but `patch=4 or higher` will be applied.

To move between major or minor versions, please contact support. We are working on automatic migrations, but it's not easy or clear how best to implement it.

## Admin access

You can access your instance admin by browsing to:

```
https://<instance-name>.pockethost.io/_
```

The PocketHost dashboard also provides a handy link to do this.

## Secrets

Instance secrets are exposed as environment variables when your `pocketbase` executable launches. Every secret you specify here will be made available as an environment variable to the `pocketbase` process.

```ts
// pb_hooks
$os.getenv('FOO')
```

## Realtime log

Coming Soon

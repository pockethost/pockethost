---
title: Managing Your Instance
---

# Managing your Instance

PocketHost provides a simple dashboard where you can manage your instance.

## On-demand Execution

PocketHost runs your PocketBase instance on-demand. That means PocketHost waits for a web request to hit PocketBase before it actually launches PocketBase and responds. This means that your instance can run on huge, beefy hardware that would be prohibitively expensive to run on your own. We can afford to do this for you because the hardware is shared with other on-demand instances.

Instances are placed in hibernation after 5 seconds of idle time.

![](/images/docs/2023-01-05-22-22-47.png)

![](/images/docs/2023-01-05-22-21-17.png)

> Note: There is a slight "first hit" penalty if PocketHost needs to spin up your idle instance before responding to a request. In practice, this is not noticeable to most users for most applications. It's nearly indistinguishable from normal network delays.

## Usage Metering

The free tier of PocketHost provides 100 _active minutes_ per month.

![](/images/docs/2023-01-05-23-02-49.png)

Because an instance stays active for a minimum of only 5 seconds per activation, 100 minutes of real, active usage is actually quite a bit. After you use your 100 minutes, you can either pay for more usage minutes, or PocketHost will move your instance to the pool of stand-by instances that get served after everyone else. Again, in practice, you will likely not even notice the difference. But if you do, there is always a paid option.

## Instance Versioning

By default, your instance will use the latest major+minor release of PocketBase. The PocketBase version is locked when your instance is created. We use [semver](https://semver.org/) ([npm package](https://docs.npmjs.com/cli/v6/using-npm/semver)) to determine the version range that should be allowed for your instance. When your instance is launched, it will use the latest matching version.

![](/images/docs/2023-01-05-22-03-18.png)

For example, if the latest version of PocketBase is `0.10.4`, your instance will automatically run with `~0.10.4`, meaning that `major=0` and `minor=10` are locked, but `patch=4 or higher` will be applied.

To move between major or minor versions, please contact support. We are working on automatic migrations, but it's not easy or clear how best to implement it.

## Admin access

You can access your instance admin by browsing to:

```
https://<instance-name>.pockethost.io/_
```

The PocketHost dashboard also provides a handy link to do this.

## Secrets

Instance secrets are defined as environment variables when a [PocketHost Cloud Function Deno worker](worker) is launched. Every secret you specify here will be made available as an environment variable to the Deno process:

```ts
const MY_SECRET = Deno.env.get('MY_SECRET') || ''
```

## Realtime log

## Backups and restores

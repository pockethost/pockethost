---
title: Accessing Your Instance
category: usage
---

Your PocketBase instance managed by PocketHost is accessible in two ways:

1. `<uuid>.pockethost.io`
2. `<subdomain>.pockethost.io`

Every PocketHost instance is assigned a UUID that never changes, and a unique subdomain that you control and can change at any time.

> Example: I use PocketHost to run the backend for my web game named Harvest. I created a PocketHost instance and chose the name `harvest`. This is unique across all of PocketHost, and I can access my instance at `https://harvest.pockethost.io`. However, because instances can be [renamed](./rename-instance.md), PocketHost also assigns a UUID that never changes. In this case, the UUID is `mfsicdp6ia1zpiu`. Thus, the instance permalink is `https://mfsicdp6ia1zpiu.pockethost.io`.

In the future, support for custom domains will be available. That is being tracked [here](https://github.com/benallfree/pockethost/issues/25).

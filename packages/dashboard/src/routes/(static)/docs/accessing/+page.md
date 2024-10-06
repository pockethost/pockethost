# Accessing an Instance

Your PocketBase instance managed by PocketHost can be accessed in two ways:

1. `<uuid>.pockethost.io`
2. `<subdomain>.pockethost.io`

Each PocketHost instance is assigned a permanent UUID, and a unique subdomain that you can customize and update at any time.

> **Example:** I use PocketHost to run the backend for my web game, Harvest. I created a PocketHost instance and chose the subdomain `harvest`, making it accessible at `https://harvest.pockethost.io`. Since instances can be [renamed](/docs/rename-instance/), PocketHost also assigns a permanent UUID. In this case, the UUID is `mfsicdp6ia1zpiu`, so the instance is always accessible at `https://mfsicdp6ia1zpiu.pockethost.io`, regardless of subdomain changes.

Custom domains are supported at the Pro level, and we manage SSL certificates for you. Learn more about setting up custom domains [here](/docs/custom-domain).

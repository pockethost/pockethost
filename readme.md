# pockethost.io

## Introduction

PocketHost is the open source the cloud hosting platform for PocketBase. https://pockethost.io is the flagship service running PocketHost, where you can host your PocketBase projects wit zero setup. Create a project like you would in Firebase and Supabase and let PocketHost do the rest.

Features:

- Create unlimited PocketBase instances
- Each instance runs on a subdomain of `pockethost.io`
- Run your instance in an ultra-beefy shared environment

**Focus on your app**

Get a live PocketBase instance in 10 seconds with no backend setup:

1. Create an account at pockethost.io
2. Provision your first PocketBase instance
3. Connect from anywhere

```ts
const client = new PocketBase(`https://harvest.pockethost.io`)
```

**Batteries Included**

Here's all the Linux/devops stuff that PocketHost does for you:

- Email and DKIM+SPF and more
- DNS jargon: MX, TXT, CNAME
- SSL cert provisioning and management
- Storage
- Volume mounts
- Cloud computing or VPS deployment
- CDN and static asset hosting
- Amazon AWS
- Lots more - scaling, firewalls, DDoS defense, user security, log rotation, patches, updates, build tools, CPU architectures, multitenancy, on and on

PocketHost is free and open source project licensed under the MIT License.

This monorepo contains the entire open source stack that powers pockethost.io. You can use it to run your own private or public multitenant platform.

**Questions?**

Head over to Discord and ask away.

## Frontend only

If you just want to work on the UI/frontend client apps, they are configured to connect to pockethost.io out of the box. This is the most convenient way to make UI modifications to the PocketHost project.

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
pnpm
pnpm dev:lander            # Marketing/blog area
pnpm dev:dashboard      # Dashboard/control panel
```

## All our base

**Running in dev mode**

Note for OS X users: if the `pocketbase` binaries do not run, it's probably your [security settings](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac).

**Prerequisites**

Local PocketHost development relies on Caddy to create reverse proxies into the various services powering the PocketHost backend. We use `lvh.me` to work with subdomains that resolve to localhost.

```bash
brew install caddy
```

Then:

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
pnpm
cp .env-template .env
```

`.env-template` is preconfigured to make all of PocketHost run locally using `lvh.me` as follows:

```bash
pnpm dev

# marketing/blog
open https://pockethost.lvh.me

# dashboard
open https://app.pockethost.lvh.me

# mothership
open https://pockethost-central.pockethost.lvh.me

# sample edge server (ph1)
open https://instance1.ph1.edge.pockethost.lvh.me

# second edge server (ph2)
open https://instance2.ph2.edge.pockethost.lvh.me
```

Additionally, the setup creates the following users and instances:

**Admin**  
https://pockethost-central.pockethost.lvh.me  
login: `admin@pockethost.lvh.me`  
password: `password`

**User**  
https://app.pockethost.lvh.me  
login: `user@pockethost.lvh.me`  
password: `password`

The user `user@pockethost.lvh.me` owns `instance1` and `instnace2`, each which is running in its own region on separate edge servers.

That's it! You can control all this and much more from the `.env-template` file. It's fully documented, but here it is again just in case.

## Public Variables (available to frontend and backend)

| Name                    | Default                     | Discussion                                                                                                                                                                                                                                         |
| ----------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUBLIC_DEBUG            | `true`                      | The global debugging variable, used by both frontends and backend services.                                                                                                                                                                        |
| PUBLIC_HTTP_PROTOCOL    | `https`                     | You can use `http` if you like, but there is really no reason to. Caddy automatically provisions SSL certificates even for local development, and Cloudflare (recommended for DNS and CDN) does too.                                               |
| PUBLIC_APEX_DOMAIN      | `pockethost.lvh.me`         | The apex domain is the domain on which all other subdomains live. If you set up your own PocketHost-based service, you'll want to change this. If you're just focusing on contributing to the project (please do!), then you can leave this as-is. |
| PUBLIC_APP_DOMAIN       | `app.<apex>`                | The fully qualified domain on which the dashboard/control panel lives (app). Probably no reason to alter this, as it defaults to `app` on the apex domain defined earlier.                                                                         |
| PUBLIC_BLOG_DOMAIN      | `<apex>`                    | The marketing/blog site lives on `<apex>` itself.                                                                                                                                                                                                  |
| PUBLIC_EDGE_APEX_DOMAIN | `<id>.edge.<apex>`          | Edge servers are the work horses of PocketHost. They receive incoming requests and route them to PocketBase instances. Each edge server needs a unique `<id>`, which are generally named after geographic regions such as `sfo-1`, `nyc-2`, etc.   |
| PUBLIC_MOTHERSHIP_URL   | `pockethost-central.<apex>` | The mothership URL is configurable because there may be cases where you want to deploy the mothership to its own central region. It does not live on an edge node.                                                                                 |

## Mothership Variables (backend only)

The Mothership is a set of backend services, including a central `pocketbase` instance, that is the source of truth for the state of PocketHost.

| Name                      | Default                                | Discussion                                                                                                                                                               |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MOTHERSHIP_MIGRATIONS_DIR | `<root>/src/mothership-app/migrations` | The directory where the Mothership migrations live. This is typically kept in revision control, so the default location is within the project directory structure.       |
| MOTHERSHIP_HOOKS_DIR      | `<root>/src/mothership-app/pb_hooks`   | The directory where the Mothership `pb_hooks` live. This is typically kept in revision control, so the default location is within the project directory structure.       |
| MOTHERSHIP_ADMIN_USERNAME | `admin@pockethost.lvh.me`              | This admin login is created the first time PocketHost runs.                                                                                                              |
| MOTHERSHIP_ADMIN_PASSWORD | `password`                             |                                                                                                                                                                          |
| DEMO_USER_USERNAME        | `user@pockethost.lvh.me`               | This login is created the first time PocketHost runs                                                                                                                     |
| DEMO_USER_PASSWORD        | `password`                             |                                                                                                                                                                          |
| MOTHERSHIP_PORT           | `8091`                                 | The port the Mothership service will listen on.                                                                                                                          |
| MOTHERSHIP_SEMVER         | `(blank)`                              | The semver used to lock the Mothership to a specific `pocketbase` version range. The Mothership will never launch with a `pocketbase` binary version outside this range. |
| MOTHERSHIP_PRIVATE_URL    | `http://mothership.pockdthost.lvh.me`  | This should be set to an intranet IP address in production settings.                                                                                                     |

## Edge Variables (backend only)

An Edge node is the workhorse of PocketHost. Edge nodes manage `pocketbase` instances, spin them up, shut them down when idle, implement security, and afford regional access to instances. They communicate with the Mothership through `MOTHERSHIP_PRIVATE_URL`.

| Name                       | Default        | Discussion                                                                                                                                                                                 |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EDGE_DATA_ROOT             | `<root>/.data` | Where the edge node should store its pocketbase instance data                                                                                                                              |
| EDGE_INSTANCE_MIN_IDLE_TTL | `5000`         | The minimum amount of time an instance must remain idle (no connections) before an edge node is allowed to shut it down to free up resources                                               |
| EDGE_INSTANCE_POOL_SIZE    | `20`           | The maximum number of simultaneous instances the edge node will allow to run concurrently. If this limit is exceeded, connections to instances not yet running in the pool will be denied. |
| \*\*IP_CIDR                | `(blank)`      | A comma-separated list of upstream proxy IP addresses or ranges PocketHost will respond to.                                                                                                |

\* Note: `PUBLIC_*` environment variables are visible to the frontend as well.

\*\* Note: [Cloudflare IP addresses](https://www.cloudflare.com/ips/) are currently: `173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22`. [Learn more about IP CIDR](https://developers.cloudflare.com/fundamentals/setup/allow-cloudflare-ip-addresses/).

## Security Variables (backend only)

| Name    | Default   | Discussion                                                                                  |
| ------- | --------- | ------------------------------------------------------------------------------------------- |
| IP_CIDR | `(blank)` | A comma-separated list of upstream proxy IP addresses or ranges PocketHost will respond to. |

Note: [Cloudflare IP addresses](https://www.cloudflare.com/ips/) are currently: `173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22`. [Learn more about IP CIDR](https://developers.cloudflare.com/fundamentals/setup/allow-cloudflare-ip-addresses/).

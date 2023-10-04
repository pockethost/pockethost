<h1>pockethost.io</h1>

This is the open source monorepo for pockethost.io, the cloud hosting platform for PocketBase.

# Introduction

https://pockethost.io hosts your PocketBase projects so you don't have to. Create a project like you would in Firebase and Supabase and let PocketHost do the rest.

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

Join us in the discussion area.

---
title: Introduction
category: getting-started
---

# 👋 Welcome to PocketHost

## Overview

PocketHost ([https://pockethost.io](https://pockethost.io)) hosts your [PocketBase](https://pocketbase.io) projects so you don't have to. Create a project like you would in Firebase and Supabase and let PocketHost do the rest.

PocketHost is a cloud hosting platform for PocketBase. You can use it to instantly provision a PocketBase backend for your latest project. Features include:

- Create unlimited PocketBase projects, each with a custom subdomain
- Each instance runs on a subdomain of `pockethost.io`
- Access your PocketBase instance using the PocketBase JavaScript SDK as easily as new `PocketBase('https://my-project.pockethost.io')`
- Run your instance in an ultra-beefy shared environment

## Focus on your app

Get a live PocketBase instance in 10 seconds with no backend setup:

1. Create an account at pockethost.io
2. Provision your first PocketBase instance
3. Connect from anywhere

```ts
const client = new PocketBase(`https://harvest.pockethost.io`)
```

## Batteries Included

Here's all the Linux/devops stuff that PocketHost does for you:

- Email and DKIM+SPF and more
- DNS jargon: MX, TXT, CNAME
- SSL cert provisioning and management
- Storage
- Volume mounts
- Could computing or VPS deployment
- CDN and static asset hosting
- Amazon AWS
- Lots more - scaling, firewalls, DDoS defense, user security, log rotation, patches, updates, build tools, CPU architectures, multitenancy, on and on

---
title: Introduction
category: getting-started
description: PocketHost, a powerful cloud hosting platform for PocketBase,
  allows you to create unlimited projects quickly and easily. With no backend
  setup required, it manages all the Linux/devops tasks, from email and DNS
  jargon to SSL management and CDN hosting, so developers can solely focus on
  building their apps.

---

# Overview

Starting a new project on PocketHost is as effortless as creating a project on Firebase or Supabase. Simply choose a custom subdomain and each PocketBase instance is instantly provisioned and managed on `pockethost.io`. Our cloud-hosted environment is built with speed and scalability in mind, and you can access your PocketBase instance using the PocketBase JavaScript SDK. It's as simple as `new PocketBase('https://my-project.pockethost.io')`.

We know that many web and nodejs programmers choose SvelteKit, React, Vercel, Firebase, and Supabase for their ease of use. That's why we've mirrored that simplicity with PocketHost. Set up a live PocketBase instance with no backend setup. Once you've created an account at pockethost.io, you can provision your first PocketBase instance and connect from anywhere.  

With PocketHost, you can forget about the time-consuming tasks of managing Linux/devops. We handle everything from email and DNS management to SSL certification, CDN hosting, and much more. This lets us give you more time to focus on what's really important: building your app and making an impact with your creation.


# 👋 Welcome to PocketHost

## Overview

PocketHost hosts your [PocketBase](https://pocketbase.io) projects, so you don't have to. Create a project like you would in Firebase and Supabase and let PocketHost do the rest.

PocketHost is a cloud hosting platform for PocketBase. You can use it to instantly provision a PocketBase backend for your latest project. Features include:

- Create unlimited PocketBase projects, each with a custom subdomain
- Each instance runs on a subdomain of `pockethost.io`
- Access your PocketBase instance using the PocketBase JavaScript SDK as easily as `new PocketBase('https://my-project.pockethost.io')`
- Run your instance in an ultra-beefy shared environment

## Focus on your app

Get a live PocketBase instance in 10 seconds with no backend setup:

1. Create an account at pockethost.io
2. Provision your first PocketBase instance
3. Connect from anywhere

```ts
import PocketBase from 'pocketbase'

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

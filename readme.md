<h1>pockethost.io</h1>

This is the open source monorepo for pockethost.io, the hosting platform for PocketBase.

<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [Introduction](#introduction)
- [Development](#development)
  - [Just the frontend (Svelte)](#just-the-frontend-svelte)
  - [All our base](#all-our-base)
- [Production Deployment](#production-deployment)
- [Release History](#release-history)

<!-- /code_chunk_output -->

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

- Docker
- Email and DKIM+SPF and more
- DNS jargon: MX, TXT, CNAME
- SSL cert provisioning and management
- Storage
- Volume mounts
- Could computing or VPS deployment
- CDN and static asset hosting
- Aamzon AWS
- Lots more - scaling, firewalls, DDoS defense, user security, log rotation, patches, updates, build tools, CPU architectures, multitenancy, on and on

This monorepo contains the entire open source stack that powers pockethost.io. You can use it to run your own private or public multitenant platform.

**Questions?**

Join us in the discussion area.

# Development

## Just the frontend (Svelte)

This is the easiest setup.

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
yarn dev:www
```

That's it. You're in business. Your local Svelte build will talk to the `pockethost.io` mothership and connect to that for all database-related tasks.

## All our base

The entire pockethost.io stack is dockerized to make it as easy as possible to mimic a production environment.

**Prerequisites**

- Docker
- Local SSL wildcard domain - [local domain setup instructions](./docs/local-domain-setup.md)

_OS X Tip - In Docker Desktop > Beta Features, enable the Virtualization framework and VirtioFS. These settings make a huge performance difference with the volume mounts used frequently with development mode_

**Running in dev mode**

The following will run the Docker stack in dev mode. Dev mode links all code to the host repo and everything will rebuild/relaunch upon modification.

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost/docker
cp .env-template-dev .env.local  # Edit as needed - defaults should work
cd ..
docker build .
docker-compose -f docker/build.yaml up --remove-orphans
docker-compose -f docker/migrate.yaml up --remove-orphans
docker-compose -f docker/install.yaml up --remove-orphans
docker-compose -f docker/dev.yaml up --remove-orphans
open https://pockethost.test
```

# Production Deployment

**1. Build**

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost/docker
cp .env-template-prod .env.local  # Edit as needed - defaults should work
cd ..
docker build .
docker compose -f docker/build.yaml up --remove-orphans
docker compose -f docker/migrate.yaml up --remove-orphans
docker-compose -f docker/install.yaml up --remove-orphans
docker compose -f docker/prod.yaml up --remove-orphans
```

**2. Refresh Certbot**

```bash
./scripts/certbot-refresh.sh
```

Then, ensure keys named `fullchain.pem` and `privkey.key` are in `docker/mount/nginx/ssl`.

**3. Run**

```bash
nohup docker-compose -f docker/docker-compose-prod.yaml --profile=serve up --remove-orphans &
open https://pockethost.io
```

# Release History

**0.5.0**

- [x] Create and restore data backups

**next**

- [x] Menu items freshened
- [x] PocketBase instance version number now shows on dashboard

**0.4.2**

- [x] Runtime metrics now show how many minutes per month an instance has used

**0.4.1**

- [x] Support for 0.7.10 and 0.8.0-rc2
- [x] Update to go 1.19.3
- [x] Docker build system updates

**0.4.0**

- [x] PocketBase 0.8 support
- [x] Introduced "platforms" concept for version control

**0.3.2**

- [x] Migrated PBScript repository to here
- [x] Accounts must now be verified before running an instance

**0.3.1**

- [x] OpenGraph support
- [x] Darkmode enhancements

**0.3.0**

- [x] Improved realtime support in proxy
- [x] Updated developer docs
- [x] Improved Docker support for dev and prod
- [x] Complete UX redesign
- [x] Idle/running status for PB instance now shows in green
- [x] Ability to run separate versions of PocketBase per instance for custom cases including beta/dev

**0.2.0**

- 100% dockerized
- Completely rewritten daemon proxy that launches PocketBase instances on demand

**0.0.1**

- Initial release

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

- Email and DKIM+SPF and more
- DNS jargon: MX, TXT, CNAME
- SSL cert provisioning and management
- Storage
- Volume mounts
- Could computing or VPS deployment
- CDN and static asset hosting
- Amazon AWS
- Lots more - scaling, firewalls, DDoS defense, user security, log rotation, patches, updates, build tools, CPU architectures, multitenancy, on and on

This monorepo contains the entire open source stack that powers pockethost.io. You can use it to run your own private or public multitenant platform.

**Questions?**

Join us in the discussion area.

# Development

## Just the frontend (Svelte)

Just want to work with the UI and frontend?

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
yarn dev:www
```

That's it. You're in business. Your local Svelte build will talk to the `pockethost.io` mothership and connect to that for all database-related tasks.

## All our base

The entire pockethost.io stack can be run locally.

**Prerequisites**

- Local SSL wildcard domain - [local domain setup instructions](./docs/local-domain-setup.md)

**Running in dev mode**

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
cp .env-template .env # modify as needed, if you used `pockethost.test` for your local domain, everything should work
scripts/dev.sh
open https://pockethost.test
open https://pockethost-central.pockethost.test
  # login: admin@pockethost.test (change in .env)
  # password: admin@pockethost.test (change in .env)
```

# Production Deployment

**1. Build**

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
cp .env-template .env # modify as needed
scripts/build.sh
```

**2. Refresh Certbot**

```bash
./scripts/certbot-refresh.sh
```

Then, ensure keys named `fullchain.pem` and `privkey.key` are in `docker/mount/nginx/ssl`.

**3. Run**

```bash
sudo scripts/pm2.sh
sudo pm2 dash
sudo open https://pockethost.io
```

**4. Test**

If all goes well:

- Update `readme.md` with latest relevant fixes.
- Create a new discussion on PocketHost forum
- If major release, create announcement on PocketBase forum
- Use `yarn version --patch` for patch release and tag with git
- Use `scripts/build.sh` to rebuild everything
- Use `scripts/pm2.sh` to run in prod mode

# Release History

**next**

- Feature: Added FAQ section and documentation link
- Fix: FTP username link is now properly URLencoded
- Fix: static asset requests are routed to PocketBase instance
- Fix: requests for instances not ending in `pockethost.io` now rejected
- Fix: realtime logging API requests no longer intercepted by PocketBase
- Fix: potential timer memory leak
- Fix: proper handling of http-proxy error conditions
- Chore: various internal error trapping and logging

**0.6.1**

- Fixed semver locking error

**0.6.0**

- FTP support
- Cache pocketbase releases
- Enhance instance uptime
- CORS PUT fix

**0.5.7**

- Fix various production errors
- Support PATCH and DELETE CORS operations
- Add pm2 production support
- Implement auto-upgrade feature and semver tagging

**0.5.6**

- Remove Docker
- PocketBase 0.10.4 update

**0.5.5**

- chore: PocketBase 0.9.2 update
- chore: PocketBase 0.10.0, 0.10.1 updates

**0.5.4**

- fix: Create Instance cancel button does not work
- fix: instances do not stay active for realtime events
- chore: support for PocketBase 0.9.0 and 0.9.1

**0.5.3**

- fix: incorrect instance information displaying on dashboard details in some cases
- fix: more helpful error message when backup fails for nonexistent instance
- chore: move version number to base package.json
- refactor: logging and async helpers
- chore: restore auto-cancellation
- chore: rebuild with go 1.19.3 and include in bin name
- fix: Disallow backups if data dir doesn't exist

**0.5.2**

- chore: rc3, rc4, 0.8.0-final support
- chore: dedupe yarn
- Fix: Account verification needs to hard-redirect
- chore: improved bootstrap TS support

**0.5.1**

- fix: 404 after creating instance
- fix: SQLite3 build

**0.5.0**

- Create data backups
- Display version near PocketHost logo
- Account activation ux enhancements
- Password reset feature
- Menu ux refresh
- PocketBase instance version number now shows on dashboard

**0.4.2**

- Runtime metrics now show how many minutes per month an instance has used

**0.4.1**

- Support for 0.7.10 and 0.8.0-rc2
- Update to go 1.19.3
- Docker build system updates

**0.4.0**

- PocketBase 0.8 support
- Introduced "platforms" concept for version control

**0.3.2**

- Migrated PBScript repository to here
- Accounts must now be verified before running an instance

**0.3.1**

- OpenGraph support
- Darkmode enhancements

**0.3.0**

- Improved realtime support in proxy
- Updated developer docs
- Improved Docker support for dev and prod
- Complete UX redesign
- Idle/running status for PB instance now shows in green
- Ability to run separate versions of PocketBase per instance for custom cases including beta/dev

**0.2.0**

- 100% dockerized
- Completely rewritten daemon proxy that launches PocketBase instances on demand

**0.0.1**

- Initial release

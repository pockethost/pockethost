---
title: Overview
category: hosting
---

[UNDER CONSTRUCTION]

This guide covers how to set up a production hosting environment for PocketHost. Hosting PocketHost might be desirable if:

- You want to create a hosting service business powered by PocketHost
- You want a private copy of PocketHost where you control all the underlying infrastructure
- You want to run PocketHost from a region not yet offered by pockethost.io

Running a hosting service is not easy. To provide a great hosting experience for users, you need to know about:

- Docker
- Email and DKIM+SPF and more
- DNS jargon: MX, TXT, CNAME
- SSL cert provisioning and management
- Storage
- Volume mounts
- Could computing or VPS deployment
- CDN and static asset hosting
- Amazon AWS
- Lots more - scaling, firewalls, DDoS defense, user security, log rotation, patches, updates, build tools, CPU architectures, multitenancy, on and on

If you're still interested in creating a PocketHost hosting environment for yourself, read on...

```
apt-get update
apt-get install -y nginx nodejs npm
npm i -g n yarn
n lts
hash -r
git clone git@github.com:benallfree/pockethost.git pockethost-latest
cd pockethost-latest
yarn
cd ..
git clone git@github.com:benallfree/pockethost.git pockethost-lts
cd pockethost-lts
yarn
cd ..

```

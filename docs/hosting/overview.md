---
title: Getting Started
category: hosting
description: Explore how to set up a production-grade hosting environment for
  PocketHost. Whether you crave control over underlying infrastructure or wish
  to run it from unoffered regions, this guide provides needful insights into
  managing Docker, handling DNS, provisioning SSL certs, and understanding cloud
  computing or VPS deployment. Discover PocketHost's abilities to transform your
  song.
---

# Overview

Power up your projects by hosting PocketHost independently. If control is what you crave, or your project operates out of pockethost.io's reach, then this guide is just what you need. Here, we unravel the intimidating knots of Docker management, DNS handling, and SSL certificate provisioning. We also offer a bird's eye view of both Cloud Computing and VPS deployment. In essence, you're about to embark on a DIY journey into the belly of PocketHost, and we're here to guide you.

Designing a hosting service isn't just ones and zeros; it's a test of your knowledge on a wide array of topics. Expect to challenge your understanding of email and SPF+DKIM, DNS terminology, storage management, volume mounting, and more. You'll also get a hands-on experience of AWS's functionalities. What's more, the trip includes valuable lessons in scaling, security, log rotation, patch management, update handling, build tools, and more.

Still intrigued by the idea of hosting your own PocketHost? Then let's delve into the practical realm. We'll kick off with the basics: updating your packages, installing necessary platforms and cloning repositories. Be prepared for an in-depth, step-by-step instruction, packed with actionable tasks. So grab your keyboards and get ready to explore a whole new horizon in PocketHost hosting.

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

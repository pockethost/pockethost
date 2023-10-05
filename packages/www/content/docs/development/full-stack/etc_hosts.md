---
title: Manually set up `/etc/hosts`
category: development
subcategory: full-stack
description: Learn how to manually configure your host entries with PocketHost
  for developers who can't utilize dnsmasq or similar tools. Navigate a slightly
  streamlined dev experience while you expand your project's reach using
  PocketHost, with support for as many '*.pockethost.test' subdomains as
  required.

---

# Overview

It's possible to manually fine-tune your host entries with PocketHost, particularly when dnsmasq and related tools are out of the question. This method offers a slightly stripped-down but nonetheless effective developer experience. Further, it supports an unlimited number of '*.pockethost.test' subdomains, enabling you to touch a wider audience as you grow your project with PocketHost.

Seize control by adding host entries to the `/etc/hosts` file. Begin by bringing up the file with a text editor like nano. Lines specified under the file associate IP addresses with host names.

Here, `127.0.0.1` directs to your local machine. Following it, you'll add 'pockethost.test'—the main domain—along with other subdomains like 'pockethost-central.pockethost.test'—the primary PocketBase instance—and 'test.pockethost.test'—an illustrative PocketBase instance at the user level.

The manual method requires specifying subdomains individually as `/etc/hosts` doesn't interpret wildcards. Therefore, you're required to add as many '*.pockethost.test' subdomains as necessary for testing manually. Although slightly more time-consuming, taking this approach ensures a steadfast connection between your development environment and PocketBase through PocketHost.


If you can't use [dnsmasq](/docs/development/full-stack/dnsmasq/) or equivalent, you can still configure hosts manually. The dev experience will be slightly more limited, but it will still work.

**1. Add host entries to `/etc./hosts`**

```bash
sudo nano /etc/hosts
```

Then, add these entries:

```
127.0.0.1 pockethost.test                      # The main domain
127.0.0.1 pockethost-central.pockethost.test   # The main pocketbase instance
127.0.0.1 test.pockethost.test                 # A sample (user) pocketbase instance
```

Add as many `*.pockethost.test` subdomains as you want to test. Since `/etc/hosts` does not support wild-carding, this must be done manually.

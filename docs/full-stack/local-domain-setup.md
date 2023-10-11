---
title: Local Domain Setup Instructions
category: development
subcategory: full-stack
description: Configure your local development environment to use wildcard
  domains with SSL for the full Dockerized stack for PocketHost. This guide
  covers steps from generating a root certificate for self-signing, approving
  the self-signed certificate in your browser, generating a wildcard domain
  certificate, to configuring your machine for wildcard localhost domains.

---

# Overview

In developing the full Dockerized stack for PocketHost, we're faced with the challenge of configuring our local dev environment to recognize wildcard domains operating via SSL. This may seem intimidating at first, but we've got it all covered in a few planed out steps. 

Start by generating a root certificate for self-signing with the `create-ca.sh` script found in the `ssl` directory. The self-signed certificate needs your approval in your web browser to function correctly. If you follow the workflow using FireFox OS X, it's a straightforward process: navigate to your settings page, search for 'cert', opt for 'View Certificates', and finally import `ca.crt` under the `Authorities` tab. For other browsers or operating systems, consult the instructions laid out on BenMorel's dev-certificates GitHub repository.

Next, it's vital to devise a wildcard domain certificate for `pocketbase.test`. Then gear up your machine to be familiar with wildcard localhost domains. Operating on OS X? Refer to the listed dnsmasq instructions. Don't forget to restart dnsmasq services each time. If you're not up for using dnsmasq, manual `/etc/hosts` setup instructions are right there for your convenience.


This document covers how to set up your local development environment to recognize wildcard domains with SSL. Developing the full Dockerized stack for PocketHost requires these steps.

**1. Generate a root certificate for self-signing.**

```bash
cd ssl
./create-ca.sh
```

**2. Manually approve the self-signed certificate in your browser.**

For FireFox OS X, do this:

1. Open settings page.
2. Search for "cert"
3. Click `View Certificates`
4. Move to the `Authorities` tab
5. Import `ca.crt`

For other browsers and operating systems, follow the instructions here: https://github.com/BenMorel/dev-certificates

**3. Generate a wildcard domain cert for `pockethost.test`**

```
./create-certificate pockethost.test
```

**4. Configure your machine to recognize wildcard localhost domains.**

If you are on OS X, follow the [dnsmasq instructions](/docs/development/full-stack/dnsmasq/) to set up your local machine for the ultimate local domain wildcard dev experience.

Remember to start `dnsmasq` every time:

```bash
brew services restart dnsmasq
```

If you don't want to use `dnsmasq`, follow the [manual /etc/hosts setup instructions](/docs/development/full-stack/etc_hosts/).

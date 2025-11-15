---
title: FAQ
description: Frequently Asked Questions about PocketHost
---
# FAQ

## About

### What is PocketHost?

[PocketHost](https://github.com/pockethost/pockethost) is an open-source, multitenant hosting platform designed for deploying and managing PocketBase backends. Licensed under the MIT license, PocketHost was created by [benallfree](https://github.com/benallfree) and is maintained by a community of contributors. Ben built PocketHost to simplify hosting for his personal and client projects, eliminating the need to set up hosting from scratch every time.

The goal of PocketHost is to provide a Firebase/Supabase-like experience where users can instantly provision new PocketBase instances.

In addition to hosting, PocketHost supports services like backup, restore, SFTP access, static file hosting, and Node.js cloud workers. It aims to deliver a turnkey solution for quickly deploying small and medium-sized PocketBase projects with minimal setup.

### What is pockethost.io?

[pockethost.io](https://pockethost.io) is the official hosting service powered by the open-source PocketHost project, also maintained by [benallfree](https://github.com/benallfree).

### What are the long-term plans?

PocketHost was created to serve the PocketBase community, combining the sovereignty benefits of self-hosting with the convenience of managed hosting.

Development priorities are driven by personal and community needs, and contributions from everyone are encouraged.

Rest assured, you can always export your instance data and self-host if needed.

## Data, Privacy, and Security

### How stable is it?

pockethost.io and PocketHost are highly stable, with over 99.964% uptime (see [Status Page](https://status.pockethost.io/)). Any outages are documented in our [Discord Community](https://discord.gg/nVTxCMEcGT).

### How often does my data get backed up?

Data is backed up daily by us. You can also back up your data anytime using SFTP.

### Is my data safe and secure?

Yes, your data on pockethost.io is as secure as it would be on your own server—potentially more so, given that our infrastructure is rigorously tested. Access to the pockethost.io infrastructure is secured via SSH with RSA-2048 encryption.

While the data volume is not encrypted at the OS level (see [#143](https://github.com/benallfree/pockethost/issues/143) for details), the VPS itself is encrypted by Digital Ocean. You can always back up and download your data via SFTP using your pockethost.io credentials.

### Can I import data into PocketHost?

Yes, data import is possible via [SFTP](/docs/ftp/).

### How do I migrate away from PocketHost and host PocketBase on my own?

You can use the SFTP feature to download and transfer all your data.

## Pricing, Limits, and Usage Restrictions

### How much does the service cost?

PocketHost offers flexible pricing tailored to how many PocketBase instances you need.  
See the full details on the [Pricing Page](https://pockethost.io/pricing).

### Usage Restrictions
PocketHost enforces restrictions to ensure a fair and reliable experience for all users:

**Fair Use**  
Your app should consume roughly the same bandwidth, storage, and CPU as the average active app on our platform. Low-traffic apps coexist efficiently with high-traffic apps through dynamic resource management.

**Prohibited Activities**  
- Illegal content or content disallowed by our partners (e.g., payment/hosting providers)  
- Spamming  
- Crypto mining  
- Any use other than hosting PocketBase for web or mobile applications  
- Misuse of resources or activities that severely affect system performance or other users’ experience

See the full details on [Terms of Service](https://pockethost.io/terms).

## PocketBase

### How does outgoing email work?

Currently, you need to configure your own outgoing email service ([SES recommended](https://pockethost.io/docs/ses)). We are tracking future plans for built-in SMTP support and discussing options [#154](https://github.com/benallfree/pockethost/discussions/154).

### How does S3 storage work?

You can set up S3 storage just like with a standalone PocketBase instance, though it’s often unnecessary, as our infrastructure already handles static asset hosting efficiently.

### What versions of PocketBase do you support, and how do I upgrade?

We support all versions of PocketBase. New versions are picked up automatically, and your instance will be upgraded with patch releases. However, upgrades across major versions are locked by default. Contact us if you wish to perform a major upgrade.

### Can I host custom PocketBase binaries or a custom Node.js backend?

Custom backend code is supported via `pb_hooks`. Support for custom PocketBase binaries and custom Node.js backends is in development.

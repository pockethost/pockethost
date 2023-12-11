---
title: FAQ
category: overview
date: 2023-12-02
description: Explore frequently asked questions about pockethost.io, one-click hosting and deployment service for PocketBase projects.
---

## About

### What is PocketHost?

[PocketHost](https://github.com/benallfree/pockethost) is an open source multitenant PocketBase server. The project is licensed under the MIT open source license. It was created and is maintained by [benallfree](https://github.com/benallfree) and a community of contributors. Ben made PocketHost to host his personal and client projects without having to set up hosting every time.

The goal of the project is to create a Firebase/Supabase style experience where users can instantly provision a new PocketBase instance.

PocketHost also supports related services such as backup, restore, SFTP access, static file hosting, and nodejs cloud workers.

PocketHost aims to provide a turnkey solution for creating and deploying small and medium-sized PocketBase projects quickly and with zero setup.

### What is pockethost.io?

https://pockethost.io is the flagship hosting service powered by the PocketHost open source project. Also created and maintained by [benallfree](https://github.com/benallfree).

### What are the long-term plans?

PocketHost was created as a service to the PocketBase community because we love the sovereignty principle of PocketBase, but also don’t always want to self host.

The features and priorities in development are driven by personal needs and everyone is encouraged to engage in the conversation and contirbute code if possible.

PocketHost has a 10-year endowment to offer a free tier of hosting for hobby projects and low to mid-volume projects.

We are experimenting with a paid tier for power users. Other options for future revenue include professional services such as enterprise setups, customization, and priority support.

You are invited to enjoy pockethost.io with the understanding that you can always export your instance data and self host if things ever change.

## Data, Privacy, and Security

### How stable is it?

pockethost.io and the underlying PocketHost project are very stable with over 99.9% uptime. Outages are documented in [the system health megathread](https://discord.com/channels/1128192380500193370/1179852349011939439).

### How often does my data get backed up?

Every day by us. Any time by you, via FTP.

### Is my data safe and secure?

Your data is as safe on pockethost.io as it is on your own server. Probably safer, because the infrastructure is tested and stressed a lot daily.

The only way to access the pockethost.io infrastructure is via SSH with RSA-2048 encryption.

Your data on the volume is NOT encrypted at an operating system level (see [#143](https://github.com/benallfree/pockethost/issues/143) for discussion), but the VPS itself is of course encrypted by Digital Ocean.

You can also back up and download all your data at any time. Access your own data via SFTP using your pockethost.io account login.

### Can I import data into PocketHost?

Yes, [via FTP](/docs/usage/ftp/).

### How do I migrate away from PocketHost and host PocketBase on my own?

Use the FTP feature to transfer all your data.

## Pricing, Limits, and Usage Restrictions

### How much does the service cost?

The PocketHost service has a free forever tier.

We are experimenting with paid tiers for power users.

### What is the pockethost.io free tier and restrictions?

pockethost.io offers a free tier to everyone. The free tier includes:

- Unlimited (fair use) CPU, bandwidth, and storage
- 1 project
- Connect to your instance from `your-instance.pockethost.io`

Please note, reality is limited by fair use. In practice, 99.9% of projects fall within our fair use ethos. If your project exceeds fair use of resources, we'll have a conversation about moving you to a more suitable plan and infrastructure.

### What paid plans are there?

pockethost.io offers a one-size-fits-all paid plan. The paid plan includes:

- Unlimited bandwidth, storage, CPU
- Unlimited projects
- Priority support
- Other premium features as they come

### Are we allowed to have multiple projects running on Pockethost? How many instances can I create?

YES! That is exactly the point of PocketHost. Provision as many PocketBase instances as you desire.

Our free tier is limited to 1 project, while the paid tier allows unlimited projects.

## PocketBase

### How does outgoing email work?

You have to set up your own outgoing email (SES recommended). [#24](https://github.com/benallfree/pockethost/issues/24) is tracking our long-term plan for supporting outgoing SMTP with zero configuration. See [#154](https://github.com/benallfree/pockethost/discussions/154) for more discussion.

### How does S3 storage work?

Set up S3 just as you would with a stand-alone PocketBase setup. However, you probably don't need to because our infrastructure already hosts your static assets efficiently.

### What versions of PocketBase do you support, and how do I upgrade?

All of them. Any time a new version comes out, our systems pick it up automatically.

Your instance is automatically upgraded with patch releases, but is locked to prevent upgrading across major boundaries. Please contact us if you wish to upgrade to a different minor or major release.

### Can I host custom PocketBase binaries or a custom nodejs backend?

Custom backend code is supported through pb_hooks only. Custom PocketBase binaries and custom nodejs backends are being developed.

---
title: FAQ
category: getting-started
---

## About

### What is pockethost.io?

https://pockethost.io is a nonprofit hosting service powered by the PocketHost open source project. Also created and run by benallfree.

[PocketHost](https://github.com/benallfree/pockethost) is an open source project licensed under the MIT open source license. It was created and is headed by [benallfree](https://github.com/benallfree). He made PocketHost to host his personal and client projects so it was easy to provision a new PocketBase instance without having to set up any servers.

The goal of the project is to create a Firebase/Supabase style experience where you can create an account and instantly provision a new PocketBase instance for yourself.

PocketHost also supports related services such as backup, restore, SFTP access, static hosting, and Deno cloud workers.

Hopefully, PocketHost provides a turnkey solution for creating and deploying small and medium-sized PocketBase projects quickly and with zero setup.

### What are the long-term plans?

PocketHost was created as a service to the PocketBase community because we love the sovereignty principle of PocketBase, but also don’t always want to self host.

The features and priorities in development are balanced between benallfree's personal needs and things requested by the community.

PocketHost has a 10-year endowment to offer a free tier of hosting for hobby projects and low to mid-volume projects.

We are experimenting with a paid tier for power users. Other options for future revenue include professional services such as enterprise setups, customization, and priority support.

You are invited to enjoy pockethost.io with the understanding that you can always export your instance data and self host if things ever change.

## Data, Privacy, and Security

### How stable is it?

pockethost.io and the underlying PocketHost project are very stable. Outages are documented in [the PocketHost discussion area](https://github.com/benallfree/pockethost/discussions/223).

### How often does my data get backed up?

Every day by us. Any time by you, via FTP.

### Is my data safe and secure?

Your data is as safe on pockethost.io as it is on your own server. Probably safer, because the infrastructure is tested and stressed a lot daily.

The only way to access the pockethost.io infrastructure is via SSH with RSA-2048 encryption.

Your data on the volume is NOT encrypted at an operating system level (see [#143](https://github.com/benallfree/pockethost/issues/143) for discussion), but the VPS itself is of course encrypted by Digital Ocean.

You can also back up and download all your data at any time. Access your own data via SFTP using your pockethost.io account login.

### Can I import data into PocketHost?

Yes, [via FTP](../usage/ftp.md).

### How do I migrate away from PocketHost and host PocketBase on my own?

Use the FTP feature to transfer all your data.

## Pricing, Limits, and Usage Restrictions

### How much does the PocketHost service cost?

The PocketHost service is free until we reach v1.0.

At that point, we will likely introduce a free tier based on "run time" minutes per month.

### What is the pockethost.io free tier and restrictions?

pockethost.io offers a free tier to everyone. The free tier includes:

- Unlimited bandwidth
- Unlimited storage
- 1 project
- Connect to your instance from `your-instance.pockethost.io`
- 100 CPU minutes per month

A "CPU minute" is one minute of your `pocketbase` instance running on our system. PocketHost shuts down idle instances to conserve resources. In practice, about 90% of projects use fewer than 100 minutes of actual CPU time per month.

The free tier is less suitable for realtime applications that require the `pocketbase` instance to run continuously.

### What paid plans are there?

pockethost.io offers a one-size-fits-all paid plan. The paid plan includes:

- Unlimited bandwidth
- Unlimited storage
- Unlimited CPU minutes
- Unlimited projects
- Connect to your instance from `your-instance.pockethost.io` or a custom domain of your choice
- Priority support

### What happens when I reach my minutes / rate / something?

Your instance will be placed into [Maintenance Mode](../daily-usage/maintenance-mode) until the problem is corrected.

### Are we allowed to have multiple projects running on Pockethost? How many instances can I create?

YES! That is exactly the point of PocketHost. Provision as many PocketBase instances as you desire.

Our free tier is limited to 1 project, while the paid tier allows unlimited projects.

## PocketBase

### How does outgoing email work?

For now, you have to set up your own outgoing email (SES recommended). [#24](https://github.com/benallfree/pockethost/issues/24) is tracking our long-term plan for supporting outgoing SMTP with zero configuration. See [#154](https://github.com/benallfree/pockethost/discussions/154) for more discussion.

### How does S3 storage work?

PocketHost doesn't do anything special for S3. If you want to use S3 for your instance, you can set it up just as you would with a normal PocketBase setup. That said, you probably don't need to because our infrastructure already hosts your static assets efficiently.

Depending on user demand, PocketHost may even push static assets out to a CDN automatically. We will probably support this at some point.

### What versions of PocketBase do you support, and how do I upgrade?

All of them. Any time a new version comes out, our systems pick it up automatically.

Your instance is automatically upgraded with patch releases, but is locked to minor releases. Please contact us if you wish to upgrade to a different minor or major release.

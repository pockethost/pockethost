# Frequently Asked Questions

## About

##### What is PocketHost?

PocketHost is a hosting provider for PocketBase projects. Our aim is to create a Firebase/Supabase style experience where you can create an account and instantly provision a new PocketBase instance for yourself.

PocketHost also supports related services such as backup, restore, SFTP access, static hosting, and Deno cloud workers.

Hopefully, PocketHost provides a turnkey solution for creating and deploying small and medium-sized PocketBase projects quickly and with zero setup.

##### Who runs PocketHost and why was it made?

PocketHost is a community project headed by [benallfree](https://github.com/benallfree). He made PocketHost to host his personal and client projects so it was easy to provision a new PocketBase instance without having to set up any servers.

##### What are the long-term plans for PocketHost? How does it make money?

PocketHost was created as a service to the PocketBase community because we love the sovereignty principle of PocketBase, but also don’t always want to self host.

The features and priorities in development are balanced between benallfree's personal needs and things requested by the community.

PocketHost has a 10-year endowment. Depending on how it grows, it might turn into a nonprofit company.

Other options for future revenue include professional services such as enterprise setups, customization, and priority support.

For now, you are invited to enjoy PocketHost with the understanding that you can always export your instance data and self host if things ever change.

##### How stable is PocketHost?

PocketHost is very stable. Outages are documented in [our discussions area](https://github.com/benallfree/pockethost/discussions).

## Data, Privacy, and Security

##### Is my data safe and secure?

Your data is as safe on PocketHost as it is on your own server Probably safer, only because the infrastructure is tested and stressed a lot daily.

The only way to access the PocketHost infrastructure is via SSH with RSA-2048 encryption.

Your data on the volume is NOT encrypted at an operating system level (see [#143](https://github.com/benallfree/pockethost/issues/143) for discussion), but the VPS itself is of course encrypted by Digital Ocean.

You can also back up and download all your data at any time. Access your own data via SFTP using your PocketHost account login.

##### Can I import data into PocketHost?

Yes, [via FTP](../usage/ftp.md).

##### How often does my data get backed up?

Every day by us. Any time by you, via FTP.

##### How do I migrate away from PocketHost and host PocketBase on my own?

Use the FTP feature to transfer all your data.

## Pricing, Limits, and Usage Restrictions

##### How much does the PocketHost service cost?

The PocketHost service is free until we reach v1.0.

At that point, we will likely introduce a free tier based on "run time" minutes per month.

##### What is the PocketHost free tier and restrictions?

PocketHost is free for unrestricted use until v1.0. After we reach v1.0, the free tier will likely be restricted to a certain number of "run time" minutes per month (ie, number of minutes your PocketBase instance is actually running and in use). The goal is to give the free tier enough to cover development and low-traffic projects.

The free tier will probably not be enough for a realtime application because realtime applications require the PocketBase instance to run continuously.

##### What paid plans are there?

PocketHost is free until v1.0. Plans are being discussed in [#44](https://github.com/benallfree/pockethost/issues/44).

Overall, the goal is to provide on-demand instances with realtime capabilities for around $20/mo.

##### What happens when I reach my minutes / rate / something?

Until v1.0, nothing happens.

##### Are we allowed to have multiple projects running on Pockethost? How many instances can I create?

YES! That is exactly the point of PocketHost. Provision as many PocketBase instances as you desire.

At some point, this may need to be restricted if abuse happens.

## PocketBase

##### How does outgoing email work?

For now, you have to set up your own outgoing email (SES recommended). [#24](https://github.com/benallfree/pockethost/issues/24) is tracking our long-term plan for supporting outgoing SMTP with zero configuration. See [#154](https://github.com/benallfree/pockethost/discussions/154) for more discussion.

##### How does S3 storage work?

PocketHost doesn't do anything special for S3. If you want to use S3 for your instance, you can set it up just as you would with a normal PocketBase setup. That said, you probably don't need to because our infrastructure already hosts your static assets efficiently.

Depending on user demand, PocketHost may even push static assets out to a CDN automatically. We will probably support this at some point.

##### What versions of PocketBase do you support, and how do I upgrade?

All of them. Any time a new version comes out, our systems pick it up automatically.

Your instance is automatically upgraded with patch releases, but is locked to minor releases. Please contact us if you wish to upgrade to a different minor or major release.

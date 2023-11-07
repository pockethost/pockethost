---
title: Maintenance Mode
category: usage
description: Discover how to utilize Maintenance Mode on PocketHost, a vital
  tool for managing PocketBase instances. Perfect for carrying out updates, data
  backups, or emergency shutdowns, Maintenance Mode ensures no unwanted requests
  are processed, prioritizing control and system health. Learn about manual
  activation and automatic triggers in this walkthrough.
---

Maintenance Mode will prevent your instances `pocketbase` process from running. No requests are processed while your instance is in Maintenance Mode.

Maintenance mode can be activated manually, or PocketHost may place your instance in maintenance mode if it detects that the instance is malfunctioning.

If your `pocketbase` process exits unexpectedly for any reason, PocketHost will place your instance in Maintenance Mode. This automatic action will cause your PocketBase instance to shut down. The `pocketbase` process will exit and no further requests will be processed.

Maintenance Mode is helpful for the following tasks:

- Updating the version [see upgrading](/docs/usage/upgrading/)
- Backing up your data [see backing up and restoring](/docs/usage/backup-and-restore/)
- Emergency shutdown for any other reason you choose.

## Manually Activating Maintenance Mode

To activate Maintenance Mode, navigate to your instance dashboard and scroll to the bottom to see the "Danger Zone".

Then, switch the instance to Maintenance Mode.

![Maintenance Mode](/docs/maintenance-mode-screenshot.png)

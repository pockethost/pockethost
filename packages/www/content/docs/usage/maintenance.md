---
title: Maintenance Mode
category: usage
description: Discover how to utilize Maintenance Mode on PocketHost, a vital
  tool for managing PocketBase instances. Perfect for carrying out updates, data
  backups, or emergency shutdowns, Maintenance Mode ensures no unwanted requests
  are processed, prioritizing control and system health. Learn about manual
  activation and automatic triggers in this walkthrough.

---

# Overview

Step into the shoes of system administrator with PocketHost's Maintenance Mode. This is an essential tool when managing PocketBase instances, providing a reliable lifeline during updates, data backups, or emergency shutdowns. It ensures zero unwanted requests are processed when your PocketBase instance requires focus on control and system health.

In the unpredictable world of software, instances can sometimes malfunction. When this occurs, PocketHost reacts by automatically activating Maintenance Mode. This action triggers an immediate shutdown of your PocketBase instance, terminating the `pocketbase` process and halting further requests.

Taking the driver's seat, you can also manually engage Maintenance Mode. During crucial tasks such as version updates, data backup and restoration, and even emergency shutdowns, you have the power to control the flow of requests.

To manually activate Maintenance Mode, steer yourself to your instance dashboard. Venture to the bottom of the page to find the "Danger Zone". Now, flip the switch to Maintenance Mode. It's as simple as that. With PocketHost in your toolkit, you'll always have total command when it comes to orchestrating your back end infrastructure.

Don't forget that these topics are further elaborated in their individual chapters - [Upgrading](/docs/usage/upgrading/) and [Backing up and Restoring](/docs/usage/backup-and-restore/).


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

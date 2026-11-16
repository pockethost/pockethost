---
title: Duplicate an Instance
description: Copy an instance into a new one on the latest PocketBase version, to try an upgrade safely
---
# Duplicate an Instance

Duplicate makes a new instance with a copy of an existing one: its data, files (`pb_hooks`, `pb_migrations`, `pb_public`), secrets and settings. The copy always starts on the latest PocketBase version, so it's the easy way to try an upgrade without touching the instance you have.

The copy counts as one of your instances, like any other.

## Make a copy

1. Open the instance and [power it off](/docs/power). Duplicate needs it off so the copy is consistent and your hooks never run in two places.
2. Go to **Duplicate**, choose a name for the copy, and select **Duplicate Instance**.
3. PocketHost copies the files. The copy can't be powered on until that's done, and its page shows when it's ready.
4. Power the copy on. When it starts, PocketBase upgrades the copied data to the new version on its own. Check the copy's logs and its admin panel, and test your app against it.

## If the copy works

To make the copy take over:

1. Keep the original powered off.
2. [Rename](/docs/rename-instance) the original to something else, then rename the copy to the original's name.
3. Delete the original, or leave it powered off as a fallback.

A copy doesn't take over the original's [custom domain](/docs/custom-domain). Move the domain to the copy yourself if you use one.

## If the copy doesn't work

Delete the copy, fix what failed (often a hook written for an older PocketBase), and duplicate again. You can repeat this as often as you like. The original is never changed.

If you're stuck, ask on [Discord](https://discord.gg/nVTxCMEcGT).

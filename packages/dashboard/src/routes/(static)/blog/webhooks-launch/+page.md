_[@cap'n](https://discord.gg/nVTxCMEcGT) Jul 22, 2025_

We've just launched webhooks support for PocketHost! This is a game-changer for anyone who needs scheduled operations or event-driven workflows with their PocketBase instances.

Previously, PocketBase's [job scheduling](https://pocketbase.io/docs/js-jobs-scheduling/) wouldn't work reliably on PocketHost because we hibernate inactive instances.

While the inbuilt job scheduling is still affected by hibernation, now you can add custom API endpoints and call them via our cron-based webhooks. Whatever you could do with the inbuilt PocketBase job scheduling can now be handled with webhooks instead.

Check it out in the dashboard today!

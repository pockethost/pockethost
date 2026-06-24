PocketHost **3.0** lands **July 1, 2026**. I am sending this to everyone now so nothing on that date feels like a surprise.

If you already host with us, the short version is: **your plan and price stay the same.** The changes below are Flounder sales ending and enforcing Pay Per PocketBase slot and storage limits on July 1.

Full reference page: [/3.0](/3.0)

### Flounder lifetime ends July 1

The **Flounder** one-time lifetime tier has been one of the best deals we ever offered. Pay once for lifetime Pay Per PocketBase hosting for as long as PocketHost exists. Same platform features as monthly slots, unmetered bandwidth and CPU under [Fair Use](/docs/pricing-ethos), plus `#onlyflounders` Discord and priority support.

**Sales stop July 1, 2026.** After that, Flounder is off the menu for new buyers.

- **Current Flounder subscribers** are grandfathered. Nothing changes for you.
- **New visitors** will not see Flounder after July 1.
- **Existing PocketHost accounts registered before July 1** get a **30-day grace window**. You have until **July 31** to buy Flounder if you still want it.

The [pricing page](/pricing) shows a countdown while sales are open. More detail: [Last call for Flounder lifetime access](/blog/flounder-lifetime-sunset).

Lifetime tiers helped bootstrap PocketHost. Going forward, recurring subscriptions are how we pay for storage, run the edge fleet, and ship features like [Auto Vacuum](/blog/auto-vacuum) and [SFTP file access](/blog/sftp-file-access). Retiring Flounder is part of that shift.

### Pay Per PocketBase (already live)

PocketHost uses a simple **Pay Per PocketBase** model: **$5/month per slot**. Each slot adds **250 MB DB data storage** and **10 GB file storage** (pooled across your account) and lets you **power on one** PocketBase at a time.

Create as many instance records as you want. Your paid slot count sets how many can be **powered on** at once.

**Jul 1 changes for everyone:** Flounder sales end, and we enforce powered-on and storage limits against your slot count. See the [pricing page](/pricing).

**If you already subscribe, your billing does not change.** Same plan, same price.

### SFTP and FTPS (already in motion)

This refresh lines up with work we have already shipped:

- **SFTP on port 2222** with Ed25519 keys is the way to manage instance files. See [SFTP file access](/blog/sftp-file-access) and [Account → Keys](/account/keys).
- **FTPS on port 21** is on a sunset path. It still works during the transition. New setups should use SFTP. See [FTPS is going away](/blog/ftps-sunset).

### What to do now

1. **On Flounder?** Decide before **July 1** (or **July 31** if you already had an account on July 1). [Pricing](/pricing) · [Get started](/get-started)
2. **Using FTPS?** Move clients and CI to SFTP when you can. [Docs](/docs/ftp) · [phio deploy](/docs/phio)
3. **Existing subscriber?** No action required. Your account is grandfathered.

We will send a reminder closer to July 1 and post again when limit enforcement goes live.

Questions? [Discord](https://discord.gg/nVTxCMEcGT) or [support](/support).

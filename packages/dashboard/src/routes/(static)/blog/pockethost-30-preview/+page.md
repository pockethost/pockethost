PocketHost **3.0** lands **July 1, 2026**. I am sending this to everyone now so nothing on that date feels like a surprise.

If you already host with us, the short version is: **your plan and price stay the same.** The changes below apply to new signups, lifetime sales, and how we communicate limits going forward.

Full reference page: [/3.0](/3.0)

### Flounder lifetime ends July 1

The **Flounder** one-time lifetime tier has been one of the best deals we ever offered. Pay once, Pro-tier hosting for as long as PocketHost exists. Unlimited instances, bandwidth, and storage under our [Fair Use](/docs/pricing-ethos) policy, plus `#onlyflounders` Discord and priority support.

**Sales stop July 1, 2026.** After that, Flounder is off the menu for new buyers.

- **Current Flounder subscribers** are grandfathered. Nothing changes for you.
- **New visitors** will not see Flounder after July 1.
- **Existing PocketHost accounts registered before July 1** get a **30-day grace window**. You have until **July 31** to buy Flounder if you still want it.

The [pricing page](/pricing) shows a countdown while sales are open. More detail: [Last call for Flounder lifetime access](/blog/flounder-lifetime-sunset).

Lifetime tiers helped bootstrap PocketHost. Going forward, recurring subscriptions are how we pay for storage, run the edge fleet, and ship features like [Auto Vacuum](/blog/auto-vacuum) and [SFTP file access](/blog/sftp-file-access). Retiring Flounder is part of that shift.

### New tiers for new signups only

Starting July 1, **new customers** see clearer monthly tiers instead of lifetime checkout:

| Tier | Price | Powered-on instances | Primary storage |
| ---- | ----- | -------------------- | --------------- |
| **Free** | $0 | 1 | 1 GB |
| **Pro** | $19.99/mo | 5 | 50 GB |
| **Agency** | $49.99/mo | 50 | 200 GB |

**If you already subscribe, your billing does not change.** Same plan, same price. These tiers apply to signups after July 1, not to existing accounts.

We will publish the full pricing page and in-dashboard checkout when 3.0 goes live.

### SFTP and FTPS (already in motion)

This refresh lines up with work we have already shipped:

- **SFTP on port 2222** with Ed25519 keys is the way to manage instance files. See [SFTP file access](/blog/sftp-file-access) and [Account → Keys](/account/keys).
- **FTPS on port 21** is on a sunset path. It still works during the transition. New setups should use SFTP. See [FTPS is going away](/blog/ftps-sunset).

### What to do now

1. **On Flounder?** Decide before **July 1** (or **July 31** if you already had an account on July 1). [Pricing](/pricing) · [Get started](/get-started)
2. **Using FTPS?** Move clients and CI to SFTP when you can. [Docs](/docs/ftp) · [phio deploy](/docs/phio)
3. **Existing subscriber?** No action required. Your account is grandfathered.

We will send a reminder closer to July 1 and post again when the new tiers go live.

Questions? [Discord](https://discord.gg/nVTxCMEcGT) or [support](/support).

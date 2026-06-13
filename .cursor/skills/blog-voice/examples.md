# Blog voice examples

## Short announcement (mirror service)

```markdown
_[@cap'n](https://discord.gg/nVTxCMEcGT) Jul 21, 2025_

PocketHost now has a `Mothership Mirror Service` that runs on the edge. It grabs all the instance and user records and caches them in memory. Then, it uses PocketBase's realtime SSE feature (live link to Mothership) to receive updates.

The result is that PocketHost edges now stay completely up to date with the Mothership without having to make any queries to it. This improves performance significantly because lookups happen locally in memory.
```

## Honest / personal (why no SLA)

```markdown
### I'm just one guy

It's just me making this thing. I have to sleep sometimes. I have a life and family, and have to take care of myself.
```

## Contrast for impact (Pocker)

```markdown
Contrast that to max 50 simultaneous instances running on a 32GB VPS with Docker. We are talking about a 20x increase in the number of instances we can run on a fraction of the hardware. It's a crazy difference.
```

## User-problem first (webhooks)

```markdown
Previously, PocketBase's job scheduling wouldn't work reliably on PocketHost because we hibernate inactive instances.

While the inbuilt job scheduling is still affected by hibernation, now you can add custom API endpoints and call them via our cron-based webhooks.
```

## What to avoid

- "We're thrilled to announce…"
- Passive voice when active is clearer
- Feature lists without explaining why anyone cares
- Jargon without context ("we refactored the IoC layer")

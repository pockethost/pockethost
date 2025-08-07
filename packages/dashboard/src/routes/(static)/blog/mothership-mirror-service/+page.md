## Enhanced Data Synchronization with MothershipMirrorService

_[@cap'n](https://discord.gg/nVTxCMEcGT) Jul 21, 2025_

PocketHost now has a `Mothership Mirror Service` that runs on the edge. It grabs all the instance and user records and caches them in memory. Then, it uses PocketBase's realtime SSE feature (live link to Mothership) to receive updates.

The result is that PocketHost edges now stay completely up to date with the Mothership without having to make any queries to it. This improves performance significantly because lookups happen locally in memory.

This improvement also positions us to begin adding more edge nodes, allowing PocketHost to expand beyond a single VPS.

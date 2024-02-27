---
title: PocketHost v0.11.0
date: 2024-02-27T11:34:43.719Z
description: >-
  PocketHost v0.11.0 introduces enhanced logging, refines FTP directory names,
  optimizes performance, and fortifies instance startup errors. Includes new
  features like Discord exception alerts, caching, and solves multiple bug
  fixes.
---

[PocketHost](https://github.com/pockethost/pockethost), the open source multitenant PocketBase server, has reached v0.11.0.

[pockethost.io](https://pockethost.io), the _zero-config / up-in-30-seconds_ flagship hosting service, is running PocketHost v0.11.0 as well.

Key updates in this release:

- Feature: Discord exception alert system.
- Feature: Edge instance caching enhancement.
- Fix: API timeout errors mitigated in InstanceService.
- Fix: Removed superfluous close in syslogger.
- Fix: Implemented instance logger shutdown when the container exits.
- Fix: Altered to wait for container start signal, not 'container' signal.

# Overview (experimental)

Here is what AI decided based on the change log (powered by [rizzdown](https://benallfree/rizzdown))...

The release of PocketHost v0.11.0 introduces essential refinements designed to uplift the developer experience. The enhancement of debug logging in InstanceService presents a granular understanding of the system's inner workings. The refactoring of FTP physical and virtual directory names, together with the PocketBase (pb) launcher, contributes to elevating performance levels - a paramount advantage for restricted bandwidth environments or large projects.

The new release also marks major strides in reliability and error handling. The update fortifies instance startup errors, instilling a high degree of robustness in PocketHost's operational repertoire. A significant development is the implementation of the Discord exception alerter. This feature brings about an error monitoring system that promptly and diligently reports exceptions to Discord, providing a gateway for expedited troubleshooting.

Two notable fixes encapsulated under v0.11.0 focus on InstanceService and system logging. The API timeout errors prevalent previously have been resolved by adjusting the 'fire and forget' mothership updates in InstanceService. Moreover, the balancing act between system operations and readability has been enhanced. The double close in the system logger has been eliminated, alongside ensuring the instance logger shuts down when the container exits, aiding in providing a cleaner feed.

# Change Log

- chore: enhance debug logging in InstanceService
- chore: refactor FTP physical and virtual directory names
- chore: refactor pb launcher for better performance
- docs: pb_hooks description clarification
- enh: fortify instance startup errors
- feat: discord exception alerter
- feat: edge instance caching
- fix: fire and forget mothership updates in InstanceService (fixes API timeout errors)
- fix: remove double close in syslogger
- fix: shut down instance logger when container exits
- fix: wait for container start signal rather than 'container' signal

You can try PocketHost and learn more at https://pockethost.io. Our thriving [Discord community](https://discord.gg/HsSjcuPRWX) awaits you :)

# Thanks

Thank you to all the [PocketHost contributors](https://github.com/pockethost/pockethost/graphs/contributors). You guys are really coming through while I'm down in the trenches keeping servers running. Onward! :)

I also want to mention the thriving Discord community. We have over 500 members and many daily active users who discuss PocketBase programming topics as well as get support for PocketHost. If you want to really feel a sense of vibrancy, it's happing in [our Discord community](https://discord.gg/HsSjcuPRWX).

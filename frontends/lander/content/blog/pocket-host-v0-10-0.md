---
title: PocketHost v0.10.0
date: 2024-02-22T20:53:56.062Z
description: >-
  PocketHost v0.10.0 introduces enhanced stability, numerous improvements, and
  critical bug fixes, assuring users of increased functionality and efficiency.
  Firm foundations for self-hosting have been laid with CLI tools and newly
  raised funds secure future developments. Detailed updates available within the
  post. Review for comprehensive information.
---

[https://pockethost.io](https://pockethost.io) and [PocketHost](https://github.com/pockethost/pockethost), the open source, _zero-config / up-in-30-seconds_, multitenant PocketBase server, have reached v0.10.0.

This is a catch-up release as we make our way toward v1.0.0. I couldn't find a good place to tag a release, and it got way behind!

Getting back on track with release tags is also important because we are working on CLI tool (npm package) that will make PocketHost way easier to self-host. That will need better change management and versioning than what I've been doing.

In other news, pockethost.io users have contributed over $20k in a grass-roots lifetime membership drive to keep pockethost.io running for years to come. Those funds are held in trust to cover hosting fees. I don't pay myself. Also, 10% goes back to PocketBase and PocketHost core contributors. I am really thankful and touched by those of you who placed your confidence in seeing PocketHost thrive. Though we may not know what a 'lifetime membership' even means, 100 of you bought one. 💚

Also a big thank you to [PocketHost contributors](https://github.com/pockethost/pockethost/graphs/contributors). You guys are really coming through while I'm down in the trenches keeping servers running. Onward! :)

I also want to mention the thriving Discord community. We have over 500 members and many daily active users who discuss PocketBase programming topics as well as get support for PocketHost. If you want to really feel a sense of vibrancy, it's happing in [our Discord community](https://discord.gg/HsSjcuPRWX).

# Overview (experimental)

Here is what AI thinks we did based on the change log (powered by [rizzdown](https://benallfree/rizzdown))...

> Version 0.10.0 of PocketHost is a consolidation of numerous minor enhancements and bug fixes positioned to enhance stability as the platform gears up for v1.0. Among the notable enhancements, the inclusion of the ‘BLOG_DOMAIN’ support and ‘PUBLIC_EDGE_APEX_DOMAIN’ provides increased capabilities for project hosting and configuration. Integrated availability checks streamline the user experience for developers, while additional type checking in the linting process should safeguard the output quality.
>
> The incremental improvements to the PocketHost system extends to the interactive dashboard. Adjustments to the environment variable updates, guards, and state management have enriched its functionality, optimizing user interaction while reinforcing the platform's vigorous security measures.
>
> From the bug perspective, the fixes span a wide range. Concerns around the security in the Dashboard have been addressed. Tackling everything from the Docker file working directory to account confirmation TS errors optimizes the system's performance and reliability. Smaller, more aesthetic changes have been executed, like fixing broken links or correcting typos, reflecting a commitment to not overlook minute details for the sake of larger components. This commitment to creating a seamless, high-quality user experience for developers aligns with the core ethos of PocketHost.

# Stats

Straight from the db query, fresh for you:

```
new_instances_last_24_hours: 38
new_instances_last_30_days: 687
new_instances_last_7_days: 192
new_instances_last_hour: 1
new_users_last_24_hours: 35
new_users_last_30_days: 610
new_users_last_7_days: 170
new_users_last_hour: 1
total_free_subscribers: 1415
total_instances: 7157
total_instances_last_24_hours: 523
total_instances_last_30_days: 2070
total_instances_last_7_days: 1140
total_instances_last_hour: 125
total_legacy_subscribers: 3582
total_lifetime_subscribers: 85
total_pro_subscribers: 21
total_users: 5103
```

# Change Log

- bugfix: instance activation
- enh: add BLOG_DOMAIN support to www project and github actions
- enh: add PUBLIC_EDGE_APEX_DOMAIN to daemon
- enh: add availability check to API
- enh: add caddy for local dev & update documentation
- enh: add exit-hook support
- enh: add imrpoved request logging for debugging
- enh: add type checking to linting
- enh: add user log message on idle shutdown
- enh: added common assert util
- enh: added component cleanup util
- enh: added dashboard guards
- enh: adjust instance defaults migration
- enh: admin sync
- enh: backend environment variable updates
- enh: catch docker exit codes >125
- enh: change support link to discord
- enh: clarify password reset language
- enh: dashboard env var refactor
- enh: dashboard environment variable updates
- enh: decouple version downloading into separate cli
- enh: define mothership port as 8091 for fewer conflicts with vscode
- enh: doc anchor styling
- enh: doc links launch new window
- enh: docs update
- enh: ignore local pocketbase binary
- enh: improve version error information
- enh: instance version migration and validation
- enh: log tail fixes and enhancements
- enh: make timeManager config optional
- enh: migrate from pockethost.test to pockethost.lvh.me
- enh: mothership restarter
- enh: new port allocation strategy
- enh: overhaul dashboard nav and state management
- enh: pockethost hooks foundation
- enh: relaxed linting requirements
- enh: release plop
- enh: remove large format overflow scrolling
- enh: remove usage chart placeholder
- enh: removed public routes guards in dashboard
- enh: show account verification bar everywhere
- enh: signup api
- enh: split dev docs out of user docs
- enh: stresser environment variable updates
- enh: update environment variable template
- enh: update to micro-dash@16
- enh: version downloader CLI and versions endpoint
- enh: winston logging
- enh: www updates for improved environment variable support
- feat: add copyable URL to dashboard
- feat: delete instance
- feat: delete instance docs
- feat: health monitoring to Discord
- feat: notify on maintenance mode
- feat: pricing
- feat: rich bulk mail
- feat: syslogd
- fix: 0.9.3 blog post title metadata fix
- fix: Dashboard security
- fix: Discord notification labeling
- fix: Dockerfile working dir
- fix: Don't require build root at this time
- fix: FTP URL fix & docs
- fix: FTP not using correct mothership URL
- fix: FTP vulnerability
- fix: LS webhook order_number
- fix: URL not defined in migration
- fix: URL path builders
- fix: account confirmation TS errors
- fix: adjust hard ulimit per container
- fix: admin sync onconflict clause
- fix: admin sync when admin account was first created manually
- fix: allow instance creation at 0 instances
- fix: blog path calculation
- fix: broken admin button in dashboard
- fix: broken docs link
- fix: broken link
- fix: caddyfile motherhsip port
- fix: change to maintenance mode if instance does not launch
- fix: click handler type fix
- fix: continuously try to log in as admin
- fix: correct discord URL
- fix: correct new instance semver
- fix: daemon and proxy error handlers
- fix: daemon pbservice unexpected exit fix
- fix: deallocate filesystem logger at shutdown
- fix: deallocate syslog file transport at shutdown
- fix: debugging filter
- fix: delete instance data
- fix: dev-daemon always starts in debugging mode
- fix: disable Docker runas pocketbase user
- fix: do not close logging connection when tabbing away
- fix: docker bind refactor - fix mothership launch
- fix: dockerfile CA images
- fix: double logging in debug mode
- fix: download.ts name
- fix: enhance PocketBaseService container rejection handling
- fix: fixed pockethost github link
- fix: founder count
- fix: frontend cloudflare CI publishing
- fix: ftp hostname
- fix: ga naming fix
- fix: getInstances refactor for API rate limiting
- fix: graceful instance restart on docker exit
- fix: health checks masking API endpoint
- fix: host.docker.internal not always available (breaks logging)
- fix: ignore types.d.ts in instance app
- fix: improve dev mode reloading for mothership
- fix: improve status code parsing on docker exit
- fix: instance app binds are read-only
- fix: instance logger tails cleaned up on exit
- fix: instance status capitalization
- fix: instance title not updating in dashboard (#364)
- fix: instance title on hard refresh
- fix: linter
- fix: linting issue
- fix: live sync script
- fix: log handle leak
- fix: log stdout color
- fix: logger properly outputs Error messages
- fix: logger suppressing some messages
- fix: maintenance mode not enqeuing notifications
- fix: make pockethost bind mount read-only
- fix: migrations and scripts should not be read-only
- fix: mobile menu height
- fix: mothership URL in dashboard
- fix: mothership process exit on pocketbase exit
- fix: move admin sync to instance app
- fix: only allocate default port if port is not specified
- fix: package overrides
- fix: patch package fix
- fix: pb_hooks module not building when @pockethost/common was included
- fix: pockethost defaults logging
- fix: pro pricing button
- fix: remove deno path
- fix: remove duplicate handler from proxy
- fix: remove extra console.log
- fix: remove left padding when logged out
- fix: removed unnecessary route from dashboard
- fix: rename DOCKER_HOST to DOCKER_CONTAINER_HOST
- fix: rename versions.pb.js to versions.js
- fix: responsive fix on instance list
- fix: revert env vars to default to prod settings
- fix: select unused port for mothership
- fix: sold out founders
- fix: spelling
- fix: spelling error
- fix: spelling mistake
- fix: subdomain validation
- fix: support link in dashboard
- fix: sync admin by default on instance create
- fix: throw error on debug for unhandled rejections and exceptions
- fix: ts fix
- fix: type error on reset pw page
- fix: typo
- fix: update instance launch failure error msg
- fix: use internal mothership address for FTP
- fix: use latest version on instance create
- fix: validate instance names at signup
- hotfix: logger tailing errors

You can try PocketHost and learn more at [https://pockethost.io](https://pockethost.io). Our thriving [Discord
community](https://discord.gg/HsSjcuPRWX) awaits you :)

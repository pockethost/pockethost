---
title: PocketHost v0.10.1
date: 2024-02-24T13:57:56.574Z
description: >-
  PocketHost v0.10.1 introduces a suite of enhancements and fixes. Notable
  updates include language clarification regarding secrets/environment variables
  and better FTP path handling. Also, improved frontend deployment via GitHub
  actions and rectifications to dashboard navigation have been updated.
---

[PocketHost](https://github.com/pockethost/pockethost), the open source multitenant PocketBase server, has reached v0.10.1.

[pockethost.io](https://pockethost.io), the _zero-config / up-in-30-seconds_ flagship hosting service, is running PocketHost v0.10.1 as well.

Updates include language clarification regarding secrets/environment variables and better FTP path handling. Also, improved frontend deployment via GitHub actions and rectifications to dashboard navigation have been updated.

# Change Log

- chore: clarify language about how secrets are forwarded as environment variables
- chore: clarify language about what's in the pocketbase pb_data directory
- chore: lockfile fix
- chore: remove unneeded restart guard in FTP
- chore: spelling updates
- chore: update release plop to scan for additional commit prefixes
- docs: backup & restore updates
- docs: clarify language on what's available via FTP
- enh: cf pages publish workflow name
- enh: force deploy frontends via github actions
- fix: correctly detect StatusCode on container exit
- fix: dashboard nav and overview
- fix: recursively create missing FTP paths

# Thanks

Thank you to all the [PocketHost contributors](https://github.com/pockethost/pockethost/graphs/contributors). You guys are really coming through while I'm down in the trenches keeping servers running. Onward! :)

I also want to mention the thriving Discord community. We have over 500 members and many daily active users who discuss PocketBase programming topics as well as get support for PocketHost. If you want to really feel a sense of vibrancy, it's happing in [our Discord community](https://discord.gg/HsSjcuPRWX).

---

You can try PocketHost and learn more at https://pockethost.io. Our thriving [Discord community](https://discord.gg/HsSjcuPRWX) awaits you :)

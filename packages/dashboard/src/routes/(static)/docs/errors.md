---
title: Common Errors
category: usage
description: Research common errors found in PocketBase and PocketHost
---

## PocketBase instance failed to launch

PocketHost tried to launch the PocketBase instance, but it exited with a failure before it even got started. Failing migrations are a common cause of this error. Check your instance logs in the PocketHost dashboard, and if there is a failing migration, remove it via [FTP](./ftp).

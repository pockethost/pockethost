---
title: Delete Instance
category: usage
description: Instances, including their subdomain and all the local data (not S3), can be deleted.
---

Delete Instance will delete your instance and data immediately.

To delete an instance, you must be in [Maintenance Mode](/docs/usage/maintenance) first, and the running status of your instance must be `Idle`.

Deleting your instance will immediately and permanently delete your instance:

- Your subdomain
- `pb_data/*`
- `pb_public/*`
- `pb_migrations/*`
- `pb_static/*`

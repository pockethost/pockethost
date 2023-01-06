---
title: FTP Access to Instances
---

# FTP Access to Instances

PocketHost allows you to access your instance data, Deno workers, and static assets via FTP.

## Accessing FTP

## `pb_data` directory

`pb_data` contains all the standard PocketBase data files. `instance_logs.db`

## `pb_public` directory

## `worker` directory

```bash
ftp <instance-name>.pockethost.io
```

```ts
import cloud_functions from './cloud_functions.md'
import ftp from './ftp.md'
import introduction from './introduction.md'

export type PageName = keyof typeof pages
export const pages = { introduction, cloud_functions, ftp }

console.log(pages)
```

Log in using your PocketHost username and password.

# pockethost.io

This is the open source monorepo for pockethost.io, the hosting platform for PocketBase.

Get up and running in 30 seconds flat:

1. Create an account at pockethost.io
2. Provision your first PocketBase instance
3. Connect from anywhere

```ts
const client = new PocketBase(`https://harvest.pockethost.io`)
```

## Powered by PocketBase

[PocketBase](https://pocketbase.io) is a single-file backend written in Go and powered by SQLite. It can scale vertically and handle massive concurrency which makes it a great choice for most business applications. And because everything is open source, you can host your own instance of PocketBase on your own infrastructure.

## Why PocketHost?

PocketBase is very, very cool. But, to run and manage it successfully, you need to know a lot of backend Linux sysadmin/devops stuff:

- Probably Docker
- Email and DKIM+SPF and more
- DNS, MX, TXT, CNAME
- SSL
- Storage
- Volume mounts
- Could computing or VPS

That's where PocketHost comes in. Firebase and Supabase have made BaaS very attrictive, and PocketHost brings that same attractiveness to PocketBase.

## Roadmap

- Tighter integration with PocketBase
- Cloud functions [PBScript](https://github.com/benallfree/pbscript)
- Lightstream support
- fly.io deployment support

## Questions?

Join us in the discussion area.

## Changelog

### 0.2.1

- Idle/running status for PB instance now shows in green
- Ability to run separate versions of PocketBase per instance for custom cases including beta/dev

### 0.2.0

- 100% dockerized
- Completley rewritten daemon proxy that launches PocketBase instances on demand

### 0.0.1

- Initial release

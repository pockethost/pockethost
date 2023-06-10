**next**

- Feature: Added FAQ section and documentation link
- Fix: FTP username link is now properly URLencoded
- Fix: static asset requests are routed to PocketBase instance
- Fix: requests for instances not ending in `pockethost.io` now rejected
- Fix: realtime logging API requests no longer intercepted by PocketBase
- Fix: potential timer memory leak
- Fix: proper handling of http-proxy error conditions
- Chore: various internal error trapping and logging
- Fix: FTP now correctly downloads static assets
- Fix: FTP now accesses `pb_migrations`
- Fix: Secrets CSS light/dark mode fixes
- Chore: remove `platform` field from instances and backups
- Docs: converted to GitBook

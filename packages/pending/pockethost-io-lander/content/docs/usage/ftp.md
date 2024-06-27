---
title: FTP Access
category: usage
description: Discover how to access your PocketBase files via Secure FTP (FTPS)
  on PocketHost. Learn how to navigate through different directories and
  understand their purposes. Explore our recommended GUI and CLI clients to
  further enhance the management of your PocketBase project online.
---

PocketHost allows you to access all your PocketBase files via Secure FTP (FTPS).

## Accessing via FTP

FTP to the address shown in your instance dashboard, then log in using your pockethost.io username and password.

The initial directory listing contains a directory for each instance associated with your account.

Inside each instance directory, you will find:

| Directory Name  | Description                                            | Instructions                                                               |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| pb_data         | The PocketBase data directory                          | [view](https://pocketbase.io/docs/going-to-production/)                    |
| pb_data/backups | The PocketBase database backups                        | [view](https://pocketbase.io/docs/going-to-production/#backup-and-restore) |
| pb_data/storage | The PocketBase uploaded file storage directory         | [view](https://pocketbase.io/docs/files-handling/)                         |
| pb_public       | The location from which public static files are served | [view](https://pocketbase.io/docs)                                         |
| pb_migrations   | The PocketBase migrations directory                    | [view](https://pocketbase.io/docs/migrations/)                             |
| pb_hooks        | The PocketBase JS hooks directory                      | [view](https://pocketbase.io/docs/js-overview/)                            |

## Recommended Clients

### GUI

- [FileZilla](https://filezilla-project.org/) is a great GUI frontend available for all platforms.
- [ftp-simple](https://marketplace.visualstudio.com/items?itemName=humy2833.ftp-simple) is a VSCode plugin

### CLI

- [ftp](https://ftp.gnu.org/)
- [wget](https://www.gnu.org/software/wget/) \[[homebrew](https://formulae.brew.sh/formula/wget)]
- [lftp](https://lftp.yar.ru/) \[[homebrew](https://formulae.brew.sh/formula/lftp)]

---
title: FTP Access
category: usage
description: Discover how to access your PocketBase files via Secure FTP (FTPS)
  on PocketHost. Learn how to navigate through different directories and
  understand their purposes. Explore our recommended GUI and CLI clients to
  further enhance the management of your PocketBase project online.

---

# Overview

In PocketHost, we believe in providing you with utmost control over your PocketBase instance. That's why we offer you access to all your PocketBase files via Secure FTP (FTPS). Simply head over to [ftp://pockethost.io](ftp://pockethost.io), pop in your pockethost.io account credentials and voila! You're in. 

Upon logging in, you'll find a directory for each instance attached to your account. Within each of these instance directories, several subdirectories exist serving different purposes. The 'pb_data' directory, for instance, is the dedicated space for all PocketBase data. If you need to oversee public files, ensure to check out the 'pb_public' directory.

For a smoother navigation experience, we recommend a couple of Powerful FTP clients. FileZilla shines as a comprehensive GUI frontend for all platforms. For terminal lovers, widely known command-line tools such as 'ftp', 'wget', or 'lftp' will serve perfectly. Remember, the right tool can boost your ability to manage your PocketBase project online promptly and efficiently. 

In PocketHost, you can be sure that we've taken that Linux administration load off your shoulders so that you can hone in on what truly matters - your code.


PocketHost allows you to access all your PocketBase files via Secure FTP (FTPS).

## Accessing via FTP

FTP to [ftp://pockethost.io](ftp://pockethost.io) and log in using your pockethost.io username and password.

The initial directory listing contains a directory for each instance associated with your account.

Inside each instance directory, you will find:

| Directory Name | Description                                     | Instructions                                            |
| -------------- | ----------------------------------------------- | ------------------------------------------------------- |
| pb_data        | The PocketBase data directory                   | [view](https://pocketbase.io/docs/going-to-production/) |
| pb_public      | The location from which public files are served | [view](https://pocketbase.io/docs)                      |
| pb_migrations  | The PocketBase migrations directory             | [view](https://pocketbase.io/docs/migrations/)          |
| pb_hooks       | The PocketBase JS hooks directory               | [view](https://pocketbase.io/docs/js-overview/)         |

## Recommended Clients

### GUI

- [FileZilla](https://filezilla-project.org/) is a great GUI frontend available for all platforms.

### CLI

- [ftp](https://ftp.gnu.org/)
- [wget](https://www.gnu.org/software/wget/) \[[homebrew](https://formulae.brew.sh/formula/wget)]
- [lftp](https://lftp.yar.ru/) \[[homebrew](https://formulae.brew.sh/formula/lftp)]

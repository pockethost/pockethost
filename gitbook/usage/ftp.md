# FTP Access

PocketHost allows you to access all your PocketBase files via Secure FTP (FTPS).

## Accessing via FTP

FTP to [ftp://pockethost.io](ftp://pockethost.io) and log in using your pockethost.io username and password.

The initial directory listing contains a directory for each instance associated with your account.

Inside each instance directory, you will find:

| Directory Name | Description                                     | Instructions                                            |
| -------------- | ----------------------------------------------- | ------------------------------------------------------- |
| pb\_data       | The PocketBase data directory                   | [view](https://pocketbase.io/docs/going-to-production/) |
| pb\_public     | The location from which public files are served | [view](https://pocketbase.io/docs)                      |
| pb\_migrations | The PocketBase migrations directory             | [view](https://pocketbase.io/docs/migrations/)          |
| pb\_hooks      | The PocketBase JS hooks directory               | [view](https://pocketbase.io/docs/js-overview/)         |
| worker         | The Deno-based cloud worker                     | [view](../daily-usage/worker.md)                        |

## Recommended Clients

### GUI

* [FileZilla](https://filezilla-project.org/) is a great GUI frontend available for all platforms.

### CLI

* [ftp](https://ftp.gnu.org/)
* [wget](https://www.gnu.org/software/wget/) \[[homebrew](https://formulae.brew.sh/formula/wget)]
* [lftp](https://lftp.yar.ru/) \[[homebrew](https://formulae.brew.sh/formula/lftp)]

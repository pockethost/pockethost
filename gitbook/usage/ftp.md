# FTP Access

PocketHost allows you to access all your PocketBase files via Secure FTP (FTPS).

## Accessing via FTP

FTP to [ftp://pockethost.io](ftp://pockethost.io) and log in using your pockethost.io username and password.

The initial directory listing contains a directory for each instance associated with your account.

Inside each instance directory, you will find:

| Directory Name | Description                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| pb_data        | The PocketBase data directory                                                 |
| pb_static      | The location from which static files are served                               |
| pb_migrations  | The PocketBase [migrations](https://pocketbase.io/docs/migrations/) directory |
| pb_hooks       | The PocketBase [hooks](https://pocketbase.io/docs/js-overview/) directory     |
| worker         | The Deno-based cloud worker                                                   |

## Recommended Clients

### GUI

- [FileZilla](https://filezilla-project.org/) is a great GUI frontend available for all platforms.

### CLI

- [ftp](https://ftp.gnu.org/)
- [wget](https://www.gnu.org/software/wget/) [[homebrew](https://formulae.brew.sh/formula/wget)]
- [lftp](https://lftp.yar.ru/) [[homebrew](https://formulae.brew.sh/formula/lftp)]

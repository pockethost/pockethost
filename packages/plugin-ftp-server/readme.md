# PocketHost FTP Server plugin

FTP Server provides a virtual filesystem atop the physical PocketHost data storage system. This allows users to safely browse and modify their data via FTPS rather than permitting shell access.

On first run, FTP will prompt for a fallback admin login and password that will allow FTP access to all instances. You can also manage it with:

```bash
pockethost ftp admin set <username> <password>
```

If you want a more multi-user approach, you can also use `@pockethost/plugin-local-auth` and `@pockethost/plugin-mothership`. Both have auth implementations that work with FTP.

If you are not running a multi-node PocketHost cloud, Mothership is overkill. Just use local auth or the built-in fallback auth.

```bash
pockethost plugin install @pockethost/plugin-ftp-server
pockethost plugin install @pockethost/plugin-local-auth
```

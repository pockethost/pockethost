# Manually set up `/etc/hosts`

Add host entries to `/etc./hosts` as follows:

```
127.0.0.1 pockethost.test                      # The main domain
127.0.0.1 pockethost-central.pockethost.test   # The main pocketbase instance
127.0.0.1 test.pockethost.test                 # A sample (user) pocketbase instance
```

Add as many `*.pockethost.test` subdomains as you want to test. Since `/etc/hosts` does not support wildcarding, this must be done manually.

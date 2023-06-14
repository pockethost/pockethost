# Manually set up `/etc/hosts`

If you can't use [dnsmasq](./dnsmasq.md) or equivalent, you can still configure hosts manually. The dev experience will be slightly more limited, but it will still work.

**1. Add host entries to `/etc./hosts`**

```bash
sudo nano /etc/hosts
```

Then, add these entires:

```
127.0.0.1 pockethost.test                      # The main domain
127.0.0.1 pockethost-central.pockethost.test   # The main pocketbase instance
127.0.0.1 test.pockethost.test                 # A sample (user) pocketbase instance
```

Add as many `*.pockethost.test` subdomains as you want to test. Since `/etc/hosts` does not support wildcarding, this must be done manually.

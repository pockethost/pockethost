First, generate a root certificate for self-signing:

```bash
cd docker/mount/nginx/ssl
./create-ca.sh
```

Then,

For FireFox OS X, do this:

1. Open settings page.
2. Search for "cert"
3. Click `View Certificates`
4. Move to the `Authorities` tab
5. Import `ca.crt`

For other browsers and operating systems, follow the instructions here: https://github.com/BenMorel/dev-certificates

Next, generate a wildcard domain cert

```
./create-certificate pockethost.test
```

If you are on OS X, follow the [dnsmasq instructions](./dnsmasq.md) to set up your local machine for the ultimate local domain wildcard dev experience.

Remember to start `dnsmasq` every time:

```bash
brew services restart dnsmasq
```

If you don't want to use `dnsmasq`, follow the [manual /etc/hosts setup instructions](./etc_hosts.md).

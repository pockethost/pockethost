# Local Domain Setup Instructions

This document covers how to set up your local development environment to recognize wildcard domains with SSL. Developing the full Dockerized stack for PocketHost requires these steps.

**1. Generate a root certificate for self-signing.**

```bash
cd ssl
./create-ca.sh
```

**2. Manually approve the self-signed certificate in your browser.**

For FireFox OS X, do this:

1. Open settings page.
2. Search for "cert"
3. Click `View Certificates`
4. Move to the `Authorities` tab
5. Import `ca.crt`

For other browsers and operating systems, follow the instructions here: https://github.com/BenMorel/dev-certificates

**3. Generate a wildcard domain cert for `pockethost.test`**

```
./create-certificate pockethost.test
```

**4. Configure your machine to recognize wildcard localhost domains.**

If you are on OS X, follow the [dnsmasq instructions](dnsmasq.md) to set up your local machine for the ultimate local domain wildcard dev experience.

Remember to start `dnsmasq` every time:

```bash
brew services restart dnsmasq
```

If you don't want to use `dnsmasq`, follow the [manual /etc/hosts setup instructions](etc_hosts.md).

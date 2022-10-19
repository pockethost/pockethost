# Developing just the frontend (Svelte)

This is the easiest setup.

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
yarn dev:www
```

That's it. You're in business. Your local Svelte build will talk to the `pockethost.io` mothership and connect to that for all database-related tasks.

# Developing the backend using `docker-compose`

The entire pockethost.io stack is dockerized to make it as easy as possible to reproduce the production environment.

**Prerequisites**

Local Docker development assumes you'll be developing against `https://pockethost.local`. You must add host entries to `/etc./hosts` as follows:

```
127.0.0.1 pockethost.local                      # The main domain
127.0.0.1 pockethost-central.pockethost.local   # The main pocketbase instance
127.0.0.1 test.pockethost.local                 # A sample (user) pocketbase instance
```

Add as many `*.pockethost.local` subdomains as you want to test. Since `/etc/hosts` does not support wildcarding, this must be done manually.

**Running in dev mode**

The following will run the Docker stack in dev mode. Dev mode links all code to the host repo and everything will rebuild/relaunch upon modification.

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost/docker
cp .env-template .env  # Edit as needed - defaults should work
cd ..
docker-compose -f docker/docker-compose.dev.yaml build
docker-compose -f docker/docker-compose.dev.yaml up
```

# Production Deployment

Coming soon.

```bash
sudo certbot --server https://acme-v02.api.letsencrypt.org/directory -d *.pockethost.io -d pockethost.io --manual --preferred-challenges dns-01 certonly
```

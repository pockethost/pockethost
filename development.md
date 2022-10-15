# Developing just the frontend (Svelte)

This is the easiest setup.

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost/packages/pockethost.io
cp .env-template-frontend-only .env
yarn dev
```

That's it. You're in business. Your local Svelte build will talk to the pockethost.io mothership and connect to that for all database-related tasks.

# Developing the backend using `docker-compose`

> WARNING: here there be monsters! Now entering Docker territory - tread softly and at your own peril

The entire pockethost.io stack is dockerized to make it as easy as possible to reproduce the production environment. It is a somewhat tedious development cycle because every change requires a build and a container to be restarted.

**Clone the repo**

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
```

**Edit `/etc/hosts`**

You need at least 3 host entries. One for the main domain, one for the database that tracks everything (the main pockethost.io db), and one (or more) for any instances you want to create a test. Wildcarding is not supported in `/etc/hosts`, so you have to make a manual entry for any PB instance you want to create and test. See `.etc-hosts-sample` for details.

```
127.0.0.1 pockethost.local                      # The main domain
127.0.0.1 pockethost-central.pockethost.local   # The main pocketbase instance
127.0.0.1 test.pockethost.local                 # A sample (user) pocketbase instance
```

**Build custom PockeBase**

_Any time you change the PocketBase code, you need to rebuild (`yarn build:_`) and restart `docker-compose`\_

This is to build the binary that runs INSIDE Docker. The Docker container will run using the same architecture as the host machine. If you are running an x86 machine, you'll probably need `build:386`. If you're running on Linux or Mac, then `arm64` is the one you want. You can try them both if you aren't sure. The worst that will happen is the `pocketbase` binary won't execute in Docker and you'll quickly discover that.

```bash
cd packages/pocketbase
go install
yarn build:arm64
yarn build:386
```

**Build daemon**

_Any time you change the daemon code, you need to rebuild (`yarn build`) and restart `docker-compose`_

```bash
cd packages/daemon
yarn build
```

**Build web app**

_Any time you change the web app, you need to rebuild (`yarn build`) and restart `docker-compose`_

```bash
cd packages/pockethost.io
cp .env-template .env
yarn build
```

**Prepare Docker environment vars**

```bash
cd docker
cp .env.template .env
```

Edit `APP_DOMAIN` to match `/etc/hosts` and `CORE_PB_PASSWORD` (needed by daemon)

**Run**

Finally, you can try running!

Note, the first time you run, if it's a fresh database, it won't be able to log in. You should see a note in the Docker log if that happens.

```bash
sudo docker-compose up
```

# Production Deployment

Coming soon.

```bash
sudo certbot --server https://acme-v02.api.letsencrypt.org/directory -d *.pockethost.io -d pockethost.io --manual --preferred-challenges dns-01 certonly
```

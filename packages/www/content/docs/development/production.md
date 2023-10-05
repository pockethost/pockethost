---
title: Production Deployment
category: development
description: Learn how to deploy your PocketHost project for production. This
  guide covers building, refreshing Certbot, running tests, as well as updating
  and maintaining PocketBase's max semver. Dive in and get your applications
  running smoothly in no time.

---

# Overview

Deploying your PocketHost project for production may seem daunting at first, especially when your focus is primarily on code creation. But fear not, this guide will get you through the necessary steps to streamline your deployment process.

Begin by setting up your project. Use `git clone git@github.com:benallfree/pockethost.git` command, followed by `cd pockethost` to enter the directory. After you have initiated your project, you need to build it, and for this, you'll leverage `scripts/build.sh`.

Next, take a moment to refresh Certbot with `./scripts/certbot-refresh.sh`. This will help ensure your SSL certs are always up-to-date, with `fullchain.pem` and `privkey.key` keys in the `docker/mount/nginx/ssl`.

Then, you're ready to run the project. Launch your project using `sudo scripts/pm2.sh` and follow up with `sudo pm2 dash` to access the dashboard. At this point, navigate to `https://pockethost.io` to test the output.

Finally, update the max PocketBase semver to limit or lock the PocketBase versions available. All you need is to tweak the `DAEMON_PB_SEMVER` variable in `.env`. And there you have it, your PocketHost project is ready to go live!


## Summary

- `sudo crontab -e`
- `sudo pm2 stop all`
- `sudo ./scripts/dev.sh`
- `sudo ./scripts/build.sh`
- `sudo ./scripts/prod.sh`
- Finalize readme
- `yarn version --patch`
- `sudo ./scripts/pm2.sh`
- `sudo crontab -e`
- Create new discussion in PocketHost and PocketBase

## Detailed steps

**1. Build**

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
cp .env-template .env # modify as needed
scripts/build.sh
```

**2. Refresh Certbot**

```bash
./scripts/certbot-refresh.sh
```

Then, ensure keys named `fullchain.pem` and `privkey.key` are in `docker/mount/nginx/ssl`.

**3. Run**

```bash
sudo scripts/pm2.sh
sudo pm2 dash
sudo open https://pockethost.io
```

**4. Test**

If all goes well:

- Update `./gitbook/releases` with latest relevant fixes.
- Create a new discussion on PocketHost forum
- If major release, create announcement on PocketBase forum
- Use `yarn version --patch` for patch release and tag with git
- Use `scripts/build.sh` to rebuild everything
- Use `scripts/pm2.sh` to run in prod mode

## Updating the max PocketBase semver

By default, PocketHost will download and run the latest version of PocketBase. If you need to limit or lock the PocketBase versions(s) available, edit the `DAEMON_PB_SEMVER` variable in `.env`.

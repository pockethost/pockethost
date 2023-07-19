# Production Deployment

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

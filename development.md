# Developer instructions


## Deployment

### Clone
```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
```

### Build custom PockeBase

```bash
cd packages/pocketbase
yarn build
```

### Build daemon

```bash
cd packages/daemon
yarn build
```

### Build web app

```bash
cd packages/pockethost.io
cp .env-template .env
nano .env
```

Edit vars as needed

```bash
yarn build
```

### Prepare Docker

```bash
cd docker
cp .env.template .env
nano .env
```

Edit `APP_DOMAIN` and `CORE_PB_PASSWORD` (needed by daemon)


Ensure that your ssl files are present there.

```bash
cd ../docker
ls ssl
```

```bash
sudo certbot --server https://acme-v02.api.letsencrypt.org/directory -d *.pockethost.io -d pockethost.io --manual --preferred-challenges dns-01 certonly
```

```bash
nano nginx-conf/nginx.conf
```

Edit as needed

## Run

```bash
sudo docker-compose up
```
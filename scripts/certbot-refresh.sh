#!/bin/bash

sudo certbot --server https://acme-v02.api.letsencrypt.org/directory -d *.pockethost.io -d pockethost.io --manual --preferred-challenges dns-01 certonly

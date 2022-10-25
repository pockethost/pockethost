#!/bin/bash

PORT=8090
SUBDOMAIN=db

sudo certbot certonly --agree-tos --nginx --email pockethost@benallfree.com -d $SUBDOMAIN.pockethost.io

NGINX_CONFIG=envsubst < nginx-template.conf

echo $NGINX_CONFIG
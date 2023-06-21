#!/bin/bash


# https://www.digitalocean.com/community/tutorials/how-to-create-let-s-encrypt-wildcard-certificates-with-certbot
certbot renew --dns-digitalocean --dns-digitalocean-credentials ~/certbot-creds.ini  
cp /etc/letsencrypt/live/pockethost.io/fullchain.pem ./ssl
cp /etc/letsencrypt/live/pockethost.io/privkey.pem ./ssl
chown pockethost:pockethost -R ./ssl
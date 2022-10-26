#!/usr/bin/env bash

# Generates a wildcard certificate for a given domain name.

set -e

if [ -z "$1" ]; then
    echo -e "\e[43mMissing domain name!\e[49m"
    echo
    echo "Usage: $0 example.com"
    echo
    echo "This will generate a wildcard certificate for the given domain name and its subdomains."
    exit
fi

DOMAIN=$1

if [ ! -f "ca.key" ]; then
    echo -e "\e[41mCertificate Authority private key does not exist!\e[49m"
    echo
    echo -e "Please run \e[93mcreate-ca.sh\e[39m first."
    exit
fi

# Generate a private key
openssl genrsa -out "$DOMAIN.key" 2048

# Create a certificate signing request
openssl req -new -subj "/C=US/O=Local Development/CN=$DOMAIN" -key "$DOMAIN.key" -out "$DOMAIN.csr"

# Create a config file for the extensions
>"$DOMAIN.ext" cat <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
EOF

# Create the signed certificate
openssl x509 -req \
    -in "$DOMAIN.csr" \
    -extfile "$DOMAIN.ext" \
    -CA ca.crt \
    -CAkey ca.key \
    -CAcreateserial \
    -out "$DOMAIN.crt" \
    -days 365 \
    -sha256

rm "$DOMAIN.csr"
rm "$DOMAIN.ext"

echo -e "\e[42mSuccess!\e[49m"
echo
echo -e "You can now use \e[93m$DOMAIN.key\e[39m and \e[93m$DOMAIN.crt\e[39m in your web server."
echo -e "Don't forget that \e[1myou must have imported \e[93mca.crt\e[39m in your browser\e[0m to make it accept the certificate."

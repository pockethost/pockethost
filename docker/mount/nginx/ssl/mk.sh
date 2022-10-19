openssl req -x509 -out pockethost.local.crt -keyout pockethost.local.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=pockethost.local' -extensions EXT -config <( \
   printf "[dn]\nCN=pockethost.local\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:pockethost.local\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")

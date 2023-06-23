#!/bin/bash

set -a
source .env
set +a

export NODE_EXTRA_CA_CERTS=`pwd`/ssl/ca.pem
echo $NODE_EXTRA_CA_CERTS
cd packages/daemon

yarn ddos "$@"
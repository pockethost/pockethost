#!/bin/bash

set -a
source .env
set +a

mv packages/daemon/daemon.log packages/daemon/daemon-`date +%s`.log
truncate -s 0 packages/daemon/daemon.log
pkill -f 'pocketbase serve'
yarn pm2
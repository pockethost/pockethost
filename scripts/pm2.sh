#!/bin/bash

set -a
source .env
set +a

mv ~/logs/daemon.log ~/logs/daemon-`date +%s`.log
truncate -s 0 packages/daemon/daemon.log
pkill -f 'pocketbase serve'
yarn pm2
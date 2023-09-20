#!/bin/bash

set -a
source .env
set +a

MOTHERSHIP_ROOT=$DAEMON_PB_DATA_DIR/$PUBLIC_PB_SUBDOMAIN
DATA_ROOT=$MOTHERSHIP_ROOT/pb_data
BACKUP_ROOT=$MOTHERSHIP_ROOT/backups
BACKUP_TARGET=$BACKUP_ROOT/`date +%s`

echo MOTHERSHIP_ROOT,$MOTHERSHIP_ROOT
echo BACKUP_ROOT,$BACKUP_ROOT
echo BACKUP_TARGET,$BACKUP_TARGET
echo DATA_ROOT,$DATA_ROOT

# Stop the service, make a backup, then restart
pm2 stop all
docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
mkdir -p $BACKUP_TARGET
cp -r $DATA_ROOT $BACKUP_TARGET
rm $BACKUP_TARGET/pb_data/logs.*
./scripts/pm2.sh

tar -zcvf $BACKUP_TARGET.tgz $BACKUP_TARGET
rm -rf $BACKUP_TARGET

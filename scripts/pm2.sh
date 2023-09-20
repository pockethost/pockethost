#!/bin/bash

set -a
source .env
set +a

LOG_ROOT=/home/pockethost/logs
# DAEMON_PREFIX=daemon
# DAEMON_LOG=$LOG_ROOT/$DAEMON_PREFIX.log
# RESTART_DATE=`date +%s`
# echo "Server restarted at $RESTART_DATE" >> $DAEMON_LOG
# mv $DAEMON_LOG $LOG_ROOT/$DAEMON_PREFIX-$RESTART_DATE.log
# echo "Server started at $RESTART_DATE" >> $DAEMON_LOG
chown pockethost:pockethost -R $LOG_ROOT 
pm2 stop all
docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
yarn pm2
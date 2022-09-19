#!/bin/sh

### BEGIN INIT INFO
# Provides:	  pockethost
# Short-Description: starts the pockethost db server
# Description:   starts the pockethost db server
### END INIT INFO

PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
NAME=pockethost
DESC=pockethost


case "$1" in
	start)
		echo "Starting $DESC" "$NAME"
    pockethost serve --http '127.0.0.1:8090' --dir /data/pockethost &

		;;
	stop)
		echo "Stopping $DESC" "$NAME"

esac

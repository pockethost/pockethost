#! /bin/bash

export PH_HOME=$(pwd)/.pockethost
export MOTHERSHIP_ROOT=$PH_HOME/data/mothership

echo $PH_HOME
echo $MOTHERSHIP_ROOT

rm -rf $MOTHERSHIP_ROOT/pb_data

./packages/pockethost/scripts/live-sync.sh

export PH_HOME=$(pwd)/.pockethost

sqlite3 "$PH_HOME/data/mothership/pb_data/data.db" < packages/pockethost/scripts/mothership-v039-preupgrade.sql

pnpm dev:cli serve

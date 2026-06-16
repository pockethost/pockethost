#! /bin/bash

export PH_HOME=$(pwd)/.pockethost
export MOTHERSHIP_ROOT=$PH_HOME/data/mothership

echo $PH_HOME
echo $MOTHERSHIP_ROOT

rm -rf $MOTHERSHIP_ROOT/pb_data

./packages/pockethost/scripts/live-sync.sh

export PH_HOME=$(pwd)/.pockethost

pnpm --filter pockethost-mothership-app build

pnpm dev:cli serve

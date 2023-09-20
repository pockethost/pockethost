#!/bin/bash

set -a
source .env
set +a

pm2 stop all
docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
yarn start
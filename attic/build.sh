#!/bin/bash

docker container rm -f pockethost
docker image rm -f pockethost
docker build -f $1 -t pockethost .
docker run --name pockethost -p 80:80  pockethost
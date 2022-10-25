#!/bin/bash


docker-compose -f docker/docker-compose-dev.yaml build
docker-compose -f docker/docker-compose-dev.yaml up --remove-orphans
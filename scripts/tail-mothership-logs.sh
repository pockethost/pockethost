#!/bin/bash

sudo tail -f ~/data/pockethost-central/logs/exec.log | jq -r ".message"
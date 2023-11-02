#!/bin/bash

# Used to back up to an encrypted drive
rsync -avz --progress --exclude 'logs.db' --exclude 'instance_logs.db' --exclude '*.db-shm' --exclude '*.db-wal' --exclude 'pb_data/types.d.ts'  pockethost.io:/home/pockethost/data/ live-data
cd live-data
du -sh ./* | sort -h
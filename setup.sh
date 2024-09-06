#!/bin/bash

# Update the package list and upgrade all packages
apt-get update -y
apt-get upgrade -y

for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do apt-get remove $pkg; done

# Add Docker's official GPG key:
apt-get update
apt-get install ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update

apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Create user pockethost with no password
adduser --disabled-password --gecos "" pockethost

# Grant passwordless sudo privileges to pockethost
echo "pockethost ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/pockethost

# Update configurations
ufw allow OpenSSH
ufw allow https
ufw allow http
ufw allow ftp
echo "y" | ufw enable

# Copy root's authorized_keys to pockethost
mkdir -p /home/pockethost/.ssh
cp /root/.ssh/authorized_keys /home/pockethost/.ssh/authorized_keys
chown -R pockethost:pockethost /home/pockethost/.ssh
chmod 700 /home/pockethost/.ssh
chmod 600 /home/pockethost/.ssh/authorized_keys

# Add GitHub to known hosts to prevent interactive prompt
su - pockethost -c "ssh-keyscan github.com >> ~/.ssh/known_hosts"


#####
# As pockethost user
#####

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
git clone git@github.com:pockethost/pockethost.git
cd pockethost
nvm install
npm i -g pnpm pm2
pnpm i
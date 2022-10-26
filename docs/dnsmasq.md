# Never touch your local /etc/hosts file in OS X again

> To setup your computer to work with \*.test domains, e.g. project.test, awesome.test and so on, without having to add to your hosts file each time.

## Requirements

- [Homebrew](https://brew.sh/)

## Install

```
brew install dnsmasq
```

## Setup

### Create config directory

```
mkdir -pv $(brew --prefix)/etc/
```

### Setup \*.test

```
echo 'address=/.test/127.0.0.1' >> $(brew --prefix)/etc/dnsmasq.conf
```

### Change port to default DNS port

```
echo 'port=53' >> $(brew --prefix)/etc/dnsmasq.conf
```

## Autostart - now and after reboot

```
sudo brew services start dnsmasq
```

## Test

```
dig testing.testing.one.two.three.test @127.0.0.1
```

## Add to resolvers

### Create resolver directory

```
sudo mkdir -v /etc/resolver
```

### Add your nameserver to resolvers

```
sudo bash -c 'echo "nameserver 127.0.0.1" > /etc/resolver/test'
```

### Test

```
# Make sure you haven't broken your DNS.
ping -c 1 www.google.com
# Check that .dev names work
ping -c 1 this.is.a.test.test
ping -c 1 iam.the.walrus.test
```

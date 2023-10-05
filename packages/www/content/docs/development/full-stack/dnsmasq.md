---
title: Never touch your local /etc/hosts file in OS X again
category: development
subcategory: full-stack
description: Learn how to streamline your developer experience by setting up
  your computer to automatically handle *.test domains using Homebrew and
  Dnsmasq. Say goodbye to manually editing your hosts file each time. This guide
  offers an easy-to-follow process for both setup and testing, ensuring smoother
  project management and development.

---

# Overview

Ever had to edit your /etc/hosts file on your OS X machine each time you spin up a new *.test domain? If so, you know it can be a manual, time-consuming process. But, good news! I'm about to teach you how to automate this using Homebrew and Dnsmasq. With the right setup, your computer will handle these domains effortlessly, streamlining your developer experience.

To get started, you'll need Homebrew installed. Next up, you'll install Dnsmasq using a simple brew command. You'll then create a specific config directory, followed by setting up your *.test domains, and configuring the port to the default DNS port. It may sound a bit technical, but don't worry, I've got you covered with a step-by-step guide.

Once the setup is complete, we will move on to autostarting it now and setting it to autostart after each reboot. Then, onto the fun part, testing! We'll test the new setup, create a resolver directory and add your nameserver to the resolvers. The aim is to ensure smooth project management and development, and most importantly, never having to manually edit your hosts file each time you create a new *.test domain. Rejoice in the simplified brilliance of your new development process!


> To set up your computer to work with \*.test domains, e.g. project.test, awesome.test and so on, without having to add to your hosts file each time.

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
---
title: Make sure you haven't broken your DNS.
---
ping -c 1 www.google.com
---
title: Check that .dev names work
---
ping -c 1 this.is.a.test.test
ping -c 1 iam.the.walrus.test
```

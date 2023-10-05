---
title: Accessing Your Instance
category: usage
description: Learn how to access your PocketBase instances managed by
  PocketHost using uniquely assigned UUIDs or your personalized subdomains.
  Discover how these instances, crucial for running projects like web games, can
  also be renamed for convenient accessibility. Future updates include
  anticipated support for custom domains.
---

# Overview

Let's dive into the crux of uncovering the inner workings of how to access your pervasive PocketBase instances, managed prudently by PocketHost. Crucial for running your avant-garde projects such as web games, these instances are the backbone of your application's backend. They can be approached via two easy gateways - you have the choice of using either the uniquely assigned, immutable UUIDs or your personalized, modifiable subdomains.

Every instance governed by PocketHost is labelled with a UUID that's like its indelible fingerprint. It's like the North Star - steadfast and unwavering no matter where you journey. Yet, as a programmer, you have the flexibility to choose your unique subdomains. Like pet names, these subdomains can be playful, meaningful, esoteric, or all of the above, free for you to change at will for convenient accessibility.

In the future, for those who truly wish to customize their experience to that extra degree, hang tight. Custom domains are on the horizon, being methodically rigged and tested even as we speak. This is yet another tool in your arsenal to connect with and engage your users, enabling you to continue building the most impressive applications.

Your PocketBase instance managed by PocketHost is accessible in two ways:

1. `<uuid>.pockethost.io`
2. `<subdomain>.pockethost.io`

Every PocketHost instance is assigned a UUID that never changes, and a unique subdomain that you control and can change at any time.

> Example: I use PocketHost to run the backend for my web game named Harvest. I created a PocketHost instance and chose the name `harvest`. This is unique across all of PocketHost, and I can access my instance at `https://harvest.pockethost.io`. However, because instances can be [renamed](/docs/usage/rename-instance/), PocketHost also assigns a UUID that never changes. In this case, the UUID is `mfsicdp6ia1zpiu`. Thus, the instance permalink is `https://mfsicdp6ia1zpiu.pockethost.io`.

In the future, support for custom domains will be available. That is being tracked [here](https://github.com/benallfree/pockethost/issues/25).

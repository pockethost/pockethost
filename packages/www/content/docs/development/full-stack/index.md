---
title: All our base
category: development
subcategory: full-stack
description: Explore how to run the entire pockethost.io stack locally, from
  setting up local SSL wildcard domain to launching the platform. This guide
  covers the necessary preparations and gives a step-by-step walkthrough to run
  in dev mode, making backend setup a breeze, even in a local environment.
---

# Overview

It's time for some thrilling backstage moments with pockethost.io! We've always loved the idea of you diving deep into our inner mechanics here at PocketHost. Why should cloud hosting have all the fun, right? So let's hit the ground running and explore how you can operate the entire pockethost.io stack right from your local environment, from configuring a local SSL wildcard domain to getting the platform up and running.

Let's be clear, this isn't beginner stuff. You can run the entire stack locally and that's no small feat. This means you can spin up a complete PocketHost platform on your personal machine, making your local back-end environment mirror that of production. This comes in handy for debugging, new feature development or just to gain a solid understanding of how the gears of PocketHost mesh together.

Moving on, you should note that you need a local SSL wildcard domain set up to get started. For our OS X users, if you encounter difficulty running `pocketbase`, your machine's security settings could likely be the impediment. Fear not, a helpful link has been included for troubleshooting this common hiccup. Now that we've got that covered, my friends, it's time for some hands-on action with pockethost.io in your own habitat!

Stay patient, stay curious, and above all, remember: Movement defines everything we do, whether it's a line of code or a jiu jitsu match! Let's put that core philosophy into practice.

The entire pockethost.io stack can be run locally.

**Prerequisites**

- Local SSL wildcard domain - [local domain setup instructions](/docs/development/full-stack/local-domain-setup/)

**Running in dev mode**

Note for OS X users: if `pocketbase` does not run, it's probably your [security settings](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac).

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
cp .env-template .env # modify as needed, if you used `pockethost.test` for your local domain, everything should work
scripts/dev.sh
open https://pockethost.test
open https://pockethost-central.pockethost.test
  # login: admin@pockethost.test (change in .env)
  # password: admin@pockethost.test (change in .env)
```

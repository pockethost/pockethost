# PocketHost Development

PocketHost is designed to run full stack on your local development machine.

## Getting started

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
yarn
yarn dev:www # Marketing site only, talks to pockethost.io
yarn dev:dashboard # Dashboard site only, talks to pockethost.io
yarn dev # Everything, talks to pockethost.lvh.me
```

## Just the Frontend

PocketHost has two frontends. Both static site generated (SSG):

1. The marketing/blog site (11ty)
2. The dashboard (sveltekit)

If you're only doing frontend development, it is much easier to point these at the production PocketHost backend instead of trying to run a local backend.

## All Our Base

You can run the complete PocketHost stack locally. A simple `yarn dev` will fire up:

- `https://pockethost.lvh.me` - Marketing/blog
- `https://app.pockethost.lvh.me` - Dashboard (app)
- `https://mothership.pockethost.lvh.me` - Mothership backend
- `https://*.sfo-1.pockethost.lvh.me` - Instance worker

**Prerequisites**

```bash
brew install caddy
```

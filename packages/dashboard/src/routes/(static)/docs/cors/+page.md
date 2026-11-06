---
title: CORS Origins
description: Limit which websites can call your PocketBase instance from the browser with the PH_CORS_ORIGINS secret
---

# CORS Origins

By default, any website can call your instance from the browser. The response always carries `Access-Control-Allow-Origin: *`, which is PocketBase's default too.

To allow only your own sites, add a [secret](/docs/secrets) named `PH_CORS_ORIGINS` with a comma-separated list of origins:

```
https://app.example.com, https://admin.example.com, http://localhost:5173
```

It takes effect within a few seconds. You don't need to restart the instance. Files Cloudflare has already cached update when they expire (see Cached files below).

## Format

Each entry is an origin: a scheme, a host, and an optional port, such as `https://app.example.com` or `http://localhost:5173`. Leave out any path and trailing slash, because the browser's `Origin` header never has one.

The matching works the same as PocketBase's `--origins` flag:

- `*` on its own allows every origin.
- `*` inside an entry matches any characters. `https://*.example.com` allows `https://app.example.com` but not `https://example.com`.
- `?` matches a single character.

Spaces around the commas are ignored. Nothing else is checked, so an entry with a typo simply never matches.

## What happens

- **Allowed origin:** the response carries `Access-Control-Allow-Origin: <that origin>`.
- **Any other origin:** the response carries no CORS header, so the browser blocks it.

PocketHost applies this at the edge for every response from your instance: the API, realtime, files, `pb_public` and your own hook routes. It also covers the edge's own responses, such as rate limits and "instance is powered off". Preflight (`OPTIONS`) requests are answered at the edge, so they don't wake a sleeping instance.

When `PH_CORS_ORIGINS` is set, it replaces any CORS headers your own hooks send.

CORS only affects browsers. It doesn't stop scripts, servers or apps from calling your API. Use [API rules](https://pocketbase.io/docs/api-rules-and-filters/) for access control.

## Cached files

Cloudflare caches some files, such as images in `pb_public` and files served from `/api/files`, separately for each origin, so CORS works for cached files too. If you change `PH_CORS_ORIGINS`, copies Cloudflare has already cached keep their old CORS header until they expire.

## Turning it off

Delete the secret. Within a few seconds every origin is allowed again, apart from files Cloudflare has already cached.

## Leaving PocketHost

Self-hosted PocketBase does the same thing with its `--origins` flag:

```bash
./pocketbase serve --origins=https://app.example.com,https://admin.example.com
```

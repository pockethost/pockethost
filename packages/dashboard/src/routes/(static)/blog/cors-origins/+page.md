Your instance answers browsers from any website with `Access-Control-Allow-Origin: *`. That's PocketBase's default, but until now you couldn't change it on PocketHost. The edge always added `*`, so PocketBase's `--origins` flag would have had no effect anyway.

Now you can.

### How it works

Add a [secret](/docs/secrets) named `PH_CORS_ORIGINS` with your allowed origins:

```
https://app.example.com, http://localhost:5173
```

The edge applies it within a few seconds, with no restart. Matching works like PocketBase's `--origins`, `*` wildcards included. It covers the API, realtime, files and your hook routes, and preflights are still answered at the edge, so they don't wake a sleeping instance.

Instances without the secret don't change at all.

### Caching

Cloudflare's cache doesn't keep a copy per origin, so with a list set, Cloudflare stops caching your instance's files. Browsers still cache them.

Details are in [CORS Origins](/docs/cors).

Questions? [Discord](https://discord.gg/nVTxCMEcGT).

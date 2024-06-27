# plugin-waf-enforce-ssl

Enforce SSL at WAF level.

## Quickstart

```bash
npx pockethost install @pockethost/plugin-waf-enforce-ssl

# now only accepts https
npx pockethost waf serve
```

## Discussion

When SSL is enforced on WAF, `PH_WAF_PORT` is ignored. Instead, it will listen on 80 and 443, redirecting any port 80 traffic to 443.

In dev mode (`PH_DEV`), a wildcard dev certificate for the `PH_APEX_DOMAIN` value will be created. In prod mode, you must create your own certificate. For example, Cloudflare issues [origin certificates](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/) which must be downloaded and used here.

Use `npx pockethost config set PH_WAF_ENFORCE_SSL_KEY <keyfile>` and `npx pockethost config set PH_WAF_ENFORCE_SSL_CERT <certfile>` to set production mode settings.

## Variables

The following variables will be used if they are found in the shell environment. PocketHost will also load them from an `.env` file if found at load time.

| Name                    | Default                                       | Discussion                                                    |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| PH_WAF_ENFORCE_SSL_HOME | `.pockethost/plugin-waf-enforce-ssl`          | The home directory for any data storage needs of this plugin. |
| PH_WAF_ENFORCE_SSL_KEY  | `.pockethost/plugin-waf-enforce-ssl/tls.key`  | The path to your SSL cert.                                    |
| PH_WAF_ENFORCE_SSL_CERT | `.pockethost/plugin-waf-enforce-ssl/tls.cert` | The path to your SSL key.                                     |

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

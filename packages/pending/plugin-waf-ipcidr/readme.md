# plugin-waf-ipcidr

This PocketHost plugin adds IP CIDR filtering to PocketHost's WAF. Useful for protecting the origin from web requests not originating from a known upstream proxy such as Cloudflare.

## Quickstart

```bash
# Install plugin
npx pockethost install @pockethost/plugin-waf-ipcidr

# Configure with Cloudflare preset
npx pockethost config add PH_WAF_IPCIDR_PRESET cloudflare

# now only accepts requests from cloudflare
npx pockethost waf serve
```

## Variables

The following variables will be used if they are found in the shell environment. PocketHost will also load them from an `.env` file if found at load time.

| Name                        | Default                         | Discussion                                                                    |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| PH_WAF_IPCIDR_HOME          | `.pockethost/plugin-waf-ipcidr` | The home directory for any data storage needs of this plugin.                 |
| PH_WAF_IPCIDR_PRESET        | `''`                            | Popular presets. Current allowed values: `cloudflare`                         |
| PH_WAF_IPCIDR_ALLOWED_CIDRS | `''`                            | A comma-separated list of allowed CIDRs. This will be merged with any preset. |

## CIDR presets

### `cloudflare`

https://www.cloudflare.com/ips/

## Support

PocketHost has a thriving [Discord community](https://discord.gg/nVTxCMEcGT).

---

### Sponsored by https://pockethost.io. Instantly host your PocketBase projects.

---

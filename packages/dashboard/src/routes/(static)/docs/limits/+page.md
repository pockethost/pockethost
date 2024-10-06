# Limits

PocketHost enforces several limits to ensure a fair and reliable experience for all users. Below are the key limitations and guidelines for usage.

## Rate Limiting

Rate limiting is imposed by **Cloudflare**, which restricts requests to **50 requests per 10 seconds per IP**. If you're making numerous requests from the client side, we recommend using the [Bottleneck NPM package](https://www.npmjs.com/package/bottleneck) to manage and throttle requests efficiently.

In special cases, such as during conferences or events where a large amount of traffic originates from a single IP, we have ways to expand or bypass these rate limits. If this applies to you, please contact [PocketHost Support](/support).

In general, exceeding the rate limit often indicates a coding issue. Another option is to write custom routes using [JS Hooks](/docs/js-hooks) to perform bulk fetching and filtering server-side, which can be difficult to manage effectively on the client side.

## Usage Limits

In addition to rate limits, we monitor:

- **Bandwidth** (both ingress and egress)
- **Storage**
- **CPU Usage**

We operate under a **Fair Use Policy** as outlined in our [Terms of Service](/terms). This means your usage is acceptable as long as it aligns with that of other users. If your usage significantly exceeds typical levels, we may contact you to discuss a resolution.

In extreme cases, if the issue cannot be resolved and it negatively impacts other users, your instance may be suspended. In severe cases, we may be forced to delete data without providing a backup. While this is rare (it has only happened once due to an abusive situation), it’s important to stay within reasonable usage limits.

## Prohibited Content

Our [Terms of Service](/terms) also outline additional limits, including restrictions on prohibited content and usage. Be sure to review these guidelines to ensure your instance complies with our policies.

---
title: Server-Side PocketBase is an Anti-Pattern
category: programming
description: Using PocketBase from SvelteKit or Next.js server files is generally an antipattern.
---

# Server-Side PocketBase is an Anti-Pattern

When building applications with PocketBase, it's tempting to access it from server-side code in frameworks like SvelteKit or Next.js. However, this approach often indicates architectural issues and should generally be avoided. Here's why:

## The Problem with Server-Side Access

### Double Network Hops

When you access PocketBase from your server-side code, requests make two network hops:

1. Client -> Your Server
2. Your Server -> PocketBase

This adds unnecessary latency compared to direct client-to-PocketBase communication.

### JWT State Management Complexity

Managing authentication state becomes more complex when you need to transfer JWT tokens between client and server. This often leads to security vulnerabilities when not handled properly.

### Rate Limiting Issues

Accessing PocketBase from a single backend IP address can trigger rate limits more easily than distributed client access. This is intentionally designed to encourage direct client communication.

## Better Approaches

### Use Direct Client Access

PocketBase is designed to be accessed directly from client applications. Its built-in security rules provide fine-grained access control without needing a middleware server.

### Leverage JS Hooks for Privileged Operations

If you need server-side logic or privileged operations, use PocketBase's JS hooks feature instead of wrapping PocketBase calls in a separate backend:

- Create custom API endpoints using JS hooks
- Handle privileged operations directly in PocketBase
- Implement business logic where it belongs

### Consider Static Site Generation

If you're using server-side rendering primarily to protect PocketBase access, consider:

- Moving to static site generation (SSG)
- Using PocketBase's security rules for protection
- Implementing sensitive operations via JS hooks

## When Server-Side Access Makes Sense

While generally an anti-pattern, there are valid cases for server-side PocketBase access:

- Complex data aggregation requiring server resources
- Integration with external services that can't be exposed to clients
- Specific security requirements that can't be met with API rules

However, even in these cases, consider whether the functionality could be implemented using PocketBase's native features first.

## Further Reading

Gani also posted about this on the PocketBase site: [JS SSR - issues and recommendations when interacting with PocketBase](https://github.com/pocketbase/pocketbase/discussions/5313)

## Conclusion

PocketBase is designed to be a complete backend solution with built-in security and extensibility. Adding an additional server layer often complicates the architecture unnecessarily. Before implementing server-side PocketBase access, consider whether you can:

1. Use client-side access with security rules
2. Implement the functionality via JS hooks
3. Restructure your application to leverage PocketBase's native capabilities

This will lead to simpler, more maintainable, and more performant applications.

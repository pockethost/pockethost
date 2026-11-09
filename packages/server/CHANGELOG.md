# pockethost

## 3.0.0

### Major Changes

- b03fa83: Implement hard paywall system with subscription management, billing integration, and user access controls

### Minor Changes

- b03fa83: Add blog functionality with dynamic promo banner integration and content management features
- b03fa83: Implement automated custom domains with Cloudflare integration and multiple domain support per instance
- b03fa83: Enhance dashboard UI with improved layout constraints, instance title cosmetics, user subscription logging, and subdomain text truncation
- b03fa83: Add MothershipMirrorService with event handlers for improved data synchronization
- b03fa83: Add subscription quantity management, billing integration improvements, and enhanced user account controls with suspension support
- b03fa83: Add webhooks support to PocketHost for scheduled and event-driven operations

### Patch Changes

- 60307e6: Add db migration support for multiple custom domains per instance
- b03fa83: Fix various issues including empty instance name validation, blog link typos, avatar digest errors, promo banner links, and delete button functionality
- b03fa83: Improve console logger browser compatibility and optimize breadcrumb handling for better debugging
- 1e02cb4: update MOTHERSHIP_URL formatting to include subdomain and trim path segments
- b03fa83: Fix firewall health check endpoints and improve HTTP status code responses for better monitoring
- b03fa83: Improve instance shutdown handling, add HandleInstanceResolve API, and enhance Docker container startup timing
- b03fa83: Improve logging consistency across services, enhance error messaging, and add container launch timing for better debugging
- b03fa83: Migrate to tsx for CLI execution, remove winston logging, and improve build tooling
- b03fa83: Update supported PocketBase versions, improve package hashes, and enhance deployment workflow with Wrangler integration

## 2.2.0

### Minor Changes

- v23 support

### Patch Changes

- a5eaa42: Default to dev mode on new instances
- ed47618: Add mothership update-versions command

## 2.1.1

### Patch Changes

- e84cd92: Fix: remove test mode from mothership email sending
- 3f5465b: Enh: daemon metrics display

## 2.1.0

### Minor Changes

- 2d2ce8c: Enh: Added custom instance idle TTL support
- 26d1070: Added support for instances hosted on alternate volumes
- eb9d8a4: Feature: cloud volume support for instances

### Patch Changes

- Fix: Mothership notifications where not being sent out

## 2.0.2

### Patch Changes

- Refactored mothership to TS using JSVM bundling

## 2.0.1

### Patch Changes

- 05ae9b3: Fix: Discord health response code check

## 2.0.0

This release is a checkpoint release to jump over v1, which has been abandoned. v0 ended up becoming v2.

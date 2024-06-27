# pockethost

## 1.4.0

### Minor Changes

- b7e4323: Added ability for plugins to respond to `pockethost serve`

## 1.3.2

### Patch Changes

- b0a78d8: Updated plugin authoring guide
- ac63ea7: Updated plugin documentation
- Updated dependencies [eb0d011]
- Updated dependencies [38d2c93]
  - @pockethost/plugin-launcher-spawn@0.2.0
  - @pockethost/plugin-console-logger@0.2.0
  - @pockethost/plugin-auto-admin@0.1.0

## 1.3.1

### Patch Changes

- 8288197: Added plugin authoring guide

## 1.3.0

### Minor Changes

- 96f355a: Now auto-creates first admin account by default
- 2fc2eeb: Added before/after instance start/stop events
- 3f99ea0: Added subdomain to request action and filter context
- 1384a86: BREAKING: refactored actions/filters

### Patch Changes

- 6812784: Added improved error parsing support
- da82667: Fix: properly determine hostname when running on nonstandard port
- cc4aa02: Moved mothership-related code into mothership plugin
- Updated dependencies [9d626ec]
  - @pockethost/plugin-launcher-spawn@0.1.0
  - @pockethost/plugin-console-logger@0.1.0

## 1.2.0

### Minor Changes

- 72a6c6d: --version now displays version number
- ac10d1f: Display notification when new pockethost update is available.
- f9aea10: Debugging info removed from `plugin ls`

### Patch Changes

- 76d57f6: CHANGELOG.md is now published with package.
- 3783447: plugin-console-logger and plugin-launcher-spawn are now automatically installed.

## 1.1.0

### Minor Changes

- 1695b59: New feature: list plugins (pockethost plugin ls)

### Patch Changes

- 2514c09: Fix: make sure PH_PLUGINS contains only unique values.
- 1228840: Fixed extra newline when listing configs

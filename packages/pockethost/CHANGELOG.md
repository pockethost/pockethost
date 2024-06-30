# pockethost

## 1.7.0

### Minor Changes

- 3c7e9bf: Added plugin template command and updated docs

## 1.6.1

### Patch Changes

- dc8f70b: Updated docs

## 1.6.0

### Minor Changes

- 40bbb3c: Improve tryFetch by accepting node-fetch params
- 12f029a: Add changeset maker
- b7277cf: Add public instance URL calculators and refactor HTTP protocol detection
- 45a8f45: Add internal app (remote control) support
- 55b43a1: Remove unneeded params from GetOrProvisionInstanceUrl filter
- 5be2c9e: Initial commit
- a236f3e: Added several more filters
- 35edc77: Enhancement: actions execute sequentially
- 879845a: Enhancement: unsubscribe from filters
- c473ed9: Added support for priorities in actions
- 795fcd7: New action: KillInstance
- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode
- cce72b3: New action: AfterPluginsLoaded
- 82dde2d: Enhancement: filters now have extensible data types

### Patch Changes

- b55c585: Clean up dead code
- 0e4bf43: Updated commit parser deps
- f79b067: Added serve command details
- dd3ceaa: Added filter debugging
- 7931204: Fixed a bug where adding plugins was not saved correctly
- 6e14f57: Updated plugin authoring guide
- 7604930: Minor fix to GetOrProvisionInstanceUrl filter
- 52b70cb: Fixed bug where --extra-plugins was not defaulting to '' correctly
- Updated dependencies [c32b845]
  - @pockethost/plugin-launcher-spawn@1.0.0
  - @pockethost/plugin-auto-admin@1.0.0
  - @pockethost/plugin-console-logger@1.0.0

## 1.5.0

### Minor Changes

- 5e9ed51: Added `--extra-plugins` global switch to temporarily load extra plugins from CLI
- 2376b0d: Add InstanceConfig filter, fix instance logger namespace, add core instance app lib
- 737b4b8: logSettings now exported from core
- 114b1d2: Add namespace() export to core Logger service

### Patch Changes

- 211fba6: Plugin authoring docs update
- 675e634: Added docs and updated maildev with plugin hook guards
- 3daf7f5: Fix: [INFO] logging prefixes
- 139468f: Updated documentation
- 1e5321b: Fix: improve plugin loading order
- Updated dependencies [517f602]
  - @pockethost/plugin-launcher-spawn@0.3.0
  - @pockethost/plugin-console-logger@0.2.1
  - @pockethost/plugin-auto-admin@0.1.1

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
